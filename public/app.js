import { auth, provider, db } from "./firebase-config.js";
import {
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
    collection, addDoc, doc, setDoc, getDoc, getDocs, query, where, Timestamp, deleteDoc, updateDoc, orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let usuarioActual = null;

onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            usuarioActual = { uid: user.uid, nombre: user.displayName || "Usuario" };
            document.getElementById('nombreUsuario').textContent = usuarioActual.nombre;
            document.getElementById('login').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            await cargarDatosMes();
            await cargarTablaGastosPorMes();
        } else {
            usuarioActual = null;
            document.getElementById('login').classList.remove('hidden');
            document.getElementById('dashboard').classList.add('hidden');
        }
    } catch (error) {
        console.error("Error en onAuthStateChanged:", error);
        alert("Error al cargar datos, revisa la consola.");
    } finally {
        document.getElementById('loading').style.display = 'none';
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
        await cargarTablaGastosPorMes();
    } catch (e) {
        console.error("Error login:", e);
        alert("No se pudo iniciar sesión");
    }
});
// preloader
window.addEventListener('load', () => {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('opacity-0');
        setTimeout(() => loading.style.display = 'none', 500);
    }
});


// Cerrar sesión
window.cerrarSesion = async () => {
    await signOut(auth);
    usuarioActual = null;
};

// Guardar monto mensual
window.guardarMontoMensual = async () => {
    if (!usuarioActual) return alert("No has iniciado sesión");

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
    await cargarTablaGastosPorMes();
};

// Guardar gasto
window.guardarGasto = async () => {
    if (!usuarioActual) return alert("No has iniciado sesión");

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
    document.getElementById("categoria").value = "";
    document.getElementById("montoGasto").value = "";
    document.getElementById("descripcion").value = "";
    cerrarModal();
    await cargarDatosMes();
    await cargarTablaGastosPorMes();
};

// Mostrar modal nuevo gasto
window.mostrarModal = () => {
    document.getElementById('modalGasto').classList.remove('hidden');
};

// Cerrar modal
window.cerrarModal = () => {
    document.getElementById('modalGasto').classList.add('hidden');
};

// Cargar datos del mes actual con historial y botones editar/eliminar
async function cargarDatosMes() {
    if (!usuarioActual) return;

    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();

    const montoDoc = await getDoc(doc(db, "montos", `${usuarioActual.uid}-${anio}-${mes}`));
    const monto = montoDoc.exists() ? montoDoc.data().montoMensual : 0;

    const q = query(
        collection(db, "gastos"),
        where("uid", "==", usuarioActual.uid),
        where("mes", "==", mes),
        where("anio", "==", anio),
        orderBy("fecha", "desc")
    );

    const querySnapshot = await getDocs(q);

    let totalGastado = 0;
    const historialContainer = document.getElementById('historial');
    historialContainer.innerHTML = ""; // limpia el historial antes de renderizar

    if (querySnapshot.empty) {
        historialContainer.innerHTML = "<p class='text-gray-500'>Sin gastos aún.</p>";
    } else {
        querySnapshot.forEach((docSnap, index) => {
            const g = docSnap.data();
            totalGastado += g.monto;
            const fechaGasto = g.fecha ? g.fecha.toDate().toLocaleString() : '';

            const gastoHTML = `
        <div class="border p-3 rounded my-1 flex justify-between items-center bg-white shadow-sm transition-all duration-300 animate-fade-in">
          <div>
            <p class="font-semibold">${g.categoria} - ${g.monto.toFixed(2)} Bs</p>
            <p class="text-gray-600 text-sm">${g.descripcion || '-'}</p>
            <p class="text-gray-400 text-xs">${fechaGasto}</p>
          </div>
          <div class="flex gap-3 text-gray-600">
            <button onclick="editarGasto('${docSnap.id}')" title="Editar" class="hover:text-blue-600">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="eliminarGasto('${docSnap.id}')" title="Eliminar" class="hover:text-red-600">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>`;

            historialContainer.insertAdjacentHTML("beforeend", gastoHTML);
        });
    }

    // Actualiza resumen
    document.getElementById('totalDisponible').textContent = `${monto.toFixed(2)} Bs`;
    document.getElementById('totalGastado').textContent = `${totalGastado.toFixed(2)} Bs`;
    document.getElementById('saldoRestante').textContent = `${(monto - totalGastado).toFixed(2)} Bs`;
}


// Cargar tabla año/mes/monto/gasto/restante (sin cambios, solo agrego check de usuario)
async function cargarTablaGastosPorMes() {
    if (!usuarioActual) return;

    const gastosQuery = query(
        collection(db, "gastos"),
        where("uid", "==", usuarioActual.uid)
    );
    const gastosSnapshot = await getDocs(gastosQuery);

    const gastosPorMes = {};
    gastosSnapshot.forEach(doc => {
        const g = doc.data();
        const key = `${g.anio}-${g.mes}`;
        if (!gastosPorMes[key]) gastosPorMes[key] = 0;
        gastosPorMes[key] += g.monto;
    });

    const montosSnapshot = await getDocs(collection(db, "montos"));
    const montosPorMes = {};
    montosSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.uid === usuarioActual.uid) {
            const key = `${data.anio}-${data.mes}`;
            montosPorMes[key] = data.montoMensual;
        }
    });

    const claves = new Set([
        ...Object.keys(gastosPorMes),
        ...Object.keys(montosPorMes)
    ]);

    let html = "";
    Array.from(claves)
        .sort((a, b) => b.localeCompare(a))
        .forEach(key => {
            const [anio, mes] = key.split("-");
            const monto = montosPorMes[key] || 0;
            const gasto = gastosPorMes[key] || 0;
            const restante = monto - gasto;

            html += `
        <tr class="border-b border-gray-200 hover:bg-gray-100">
          <td class="py-3 px-6 text-left">${anio}</td>
          <td class="py-3 px-6 text-left">${obtenerNombreMes(parseInt(mes))} (${mes})</td>
          <td class="py-3 px-6 text-left">${monto.toFixed(2)} Bs</td>
          <td class="py-3 px-6 text-left">${gasto.toFixed(2)} Bs</td>
          <td class="py-3 px-6 text-left">${restante.toFixed(2)} Bs</td>
        </tr>`;
        });

    document.getElementById('cuerpoTablaGastosMes').innerHTML = html || `<tr><td colspan="5" class="text-center p-4 text-gray-500">Sin datos aún.</td></tr>`;
}

function obtenerNombreMes(numeroMes) {
    const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return nombres[numeroMes - 1] || "";
}

// Eliminar gasto con confirmación SweetAlert2
window.eliminarGasto = async (idGasto) => {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir esto!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "gastos", idGasto));
            Swal.fire('Eliminado', 'El gasto fue eliminado.', 'success');
            await cargarDatosMes();
            await cargarTablaGastosPorMes();
        } catch (error) {
            console.error("Error al eliminar gasto:", error);
            Swal.fire('Error', 'No se pudo eliminar el gasto.', 'error');
        }
    }
};

// Editar gasto con formulario SweetAlert2
window.editarGasto = async (idGasto) => {
    try {
        const gastoRef = doc(db, "gastos", idGasto);
        const gastoSnap = await getDoc(gastoRef);
        if (!gastoSnap.exists()) return Swal.fire('Error', 'Gasto no encontrado', 'error');

        const gastoData = gastoSnap.data();

        const { value: formValues } = await Swal.fire({
            title: 'Editar Gasto',
            html:
                `<select id="swal-categoria" class="swal2-input">
                    <option value="Comida" ${gastoData.categoria === 'Comida' ? 'selected' : ''}>Comida</option>
                    <option value="Transporte" ${gastoData.categoria === 'Transporte' ? 'selected' : ''}>Transporte</option>
                    <option value="Servicios" ${gastoData.categoria === 'Servicios' ? 'selected' : ''}>Servicios</option>
                    <option value="Hogar" ${gastoData.categoria === 'Hogar' ? 'selected' : ''}>Hogar</option>
                    <option value="Caprichos" ${gastoData.categoria === 'Caprichos' ? 'selected' : ''}>Mis Caprichos</option>
                    <option value="Otros" ${gastoData.categoria === 'Otros' ? 'selected' : ''}>Otros</option>
                </select>
                <input id="swal-monto" type="number" min="0.01" step="0.01" class="swal2-input" placeholder="Monto" value="${gastoData.monto}" />
                <input id="swal-descripcion" type="text" class="swal2-input" placeholder="Descripción" value="${gastoData.descripcion || ''}" />`,
            focusConfirm: false,
            preConfirm: () => {
                return {
                    categoria: document.getElementById('swal-categoria').value,
                    monto: parseFloat(document.getElementById('swal-monto').value),
                    descripcion: document.getElementById('swal-descripcion').value.trim()
                };
            }
        });

        if (formValues) {
            if (!formValues.monto || formValues.monto <= 0) {
                return Swal.fire('Error', 'Monto inválido', 'error');
            }
            await updateDoc(gastoRef, {
                categoria: formValues.categoria,
                monto: formValues.monto,
                descripcion: formValues.descripcion
            });
            Swal.fire('Guardado', 'Gasto actualizado correctamente', 'success');
            await cargarDatosMes();
            await cargarTablaGastosPorMes();
        }
    } catch (error) {
        console.error("Error al editar gasto:", error);
        Swal.fire('Error', 'No se pudo editar el gasto.', 'error');
    }
};
// Función para cerrar sesión
window.cerrarSesion = async () => {
    try {
        await signOut(auth);
        // Opcional: Mostrar alerta de confirmación o éxito
        Swal.fire({
            icon: 'success',
            title: 'Sesión cerrada',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cerrar sesión.'
        });
    }
};
