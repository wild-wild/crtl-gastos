import { auth, provider, db } from "./firebase-config.js";
import {
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
    collection, addDoc, doc, setDoc, getDoc, getDocs, query, where, Timestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let usuarioActual = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioActual = { uid: user.uid, nombre: user.displayName || "Usuario" };
        document.getElementById('nombreUsuario').textContent = usuarioActual.nombre;
        document.getElementById('login').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        await cargarDatosMes();
        await cargarResumenPorMes();
    } else {
        document.getElementById('login').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
});

// Login con Google
document.getElementById('btnGoogle').addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        usuarioActual = {
            uid: result.user.uid,
            nombre: result.user.displayName || "Usuario"
        };
        document.getElementById('nombreUsuario').textContent = usuarioActual.nombre;
        document.getElementById('login').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        await cargarDatosMes();
        await cargarResumenPorMes();   // ✅ cargar resumen aquí también
    } catch (e) {
        console.error("Error login:", e);
        alert("No se pudo iniciar sesión");
    }
});

// Cerrar sesión
window.cerrarSesion = async () => {
    await signOut(auth);
};

// Guardar monto mensual
window.guardarMontoMensual = async () => {
    const monto = parseFloat(document.getElementById('montoMensual').value);
    if (!monto || monto <= 0) return alert("Ingresa un monto válido");

    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();

    await setDoc(doc(db, "montos", `${usuarioActual.uid}-${anio}-${mes}`), {
        uid: usuarioActual.uid,
        nombre: usuarioActual.nombre,
        montoMensual: monto,
        mes,
        anio,
        fecha: Timestamp.fromDate(new Date(anio, mes - 1, 1))
    });
    await cargarDatosMes();
};

// Guardar gasto
window.guardarGasto = async () => {
    const categoria = document.getElementById('categoria').value;
    const monto = parseFloat(document.getElementById('montoGasto').value);
    const descripcion = document.getElementById('descripcion').value || "";
    if (!monto || monto <= 0) return alert("Monto inválido");

    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();

    await addDoc(collection(db, "gastos"), {
        uid: usuarioActual.uid,
        categoria,
        monto,
        descripcion,
        fecha: Timestamp.fromDate(fecha),
        mes,
        anio
    });
    cerrarModal();
    await cargarDatosMes();
    await cargarResumenPorMes();  // actualizar resumen también
};

// Mostrar modal nuevo gasto
window.mostrarModal = () => {
    document.getElementById('modalGasto').classList.remove('hidden');
};

// Cerrar modal
window.cerrarModal = () => {
    document.getElementById('modalGasto').classList.add('hidden');
};

// Cargar datos del mes actual
async function cargarDatosMes() {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();

    const montoDoc = await getDoc(doc(db, "montos", `${usuarioActual.uid}-${anio}-${mes}`));
    const monto = montoDoc.exists() ? montoDoc.data().montoMensual : 0;

    const q = query(
        collection(db, "gastos"),
        where("uid", "==", usuarioActual.uid),
        where("mes", "==", mes),
        where("anio", "==", anio)
    );
    const querySnapshot = await getDocs(q);

    let totalGastado = 0;
    let historialHTML = "";
    querySnapshot.forEach((doc) => {
        const g = doc.data();
        totalGastado += g.monto;
        historialHTML += `
      <div class="border p-2 rounded my-1">
        <p class="font-semibold">${g.categoria} - ${g.monto} Bs</p>
        <p class="text-gray-600 text-sm">${g.descripcion}</p>
      </div>`;
    });

    document.getElementById('totalDisponible').textContent = `${monto} Bs`;
    document.getElementById('totalGastado').textContent = `${totalGastado} Bs`;
    document.getElementById('saldoRestante').textContent = `${(monto - totalGastado).toFixed(2)} Bs`;
    document.getElementById('historial').innerHTML = historialHTML || "<p class='text-gray-500'>Sin gastos aún.</p>";
}

// Resumen por mes
async function cargarResumenPorMes() {
    const q = query(
        collection(db, "gastos"),
        where("uid", "==", usuarioActual.uid)
    );
    const querySnapshot = await getDocs(q);

    const resumen = {};
    querySnapshot.forEach(doc => {
        const g = doc.data();
        const clave = `${g.anio}-${g.mes}`;
        if (!resumen[clave]) resumen[clave] = 0;
        resumen[clave] += g.monto;
    });

    let resumenHTML = "";
    Object.entries(resumen)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([clave, total]) => {
            const [anio, mes] = clave.split("-");
            const nombreMes = obtenerNombreMes(parseInt(mes));
            resumenHTML += `<div class="border p-2 rounded">
        <span>${nombreMes} ${anio} / </span>
        <span class="font-semibold">${total} Bs</span>
      </div>`;
        });

    document.getElementById('resumenPorMes').innerHTML = resumenHTML || "<p class='text-gray-500'>Sin datos aún.</p>";
}

function obtenerNombreMes(numeroMes) {
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return nombres[numeroMes - 1] || "";
}
