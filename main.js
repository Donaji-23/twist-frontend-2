"use strict";

// Obtenemos las referencias expuestas desde index.html
const db = window.db;
const { collection, doc, setDoc, onSnapshot, updateDoc } = window.firebaseFns;

// Referencias a elementos del DOM
const twistInput = document.getElementById("twistInput");
const publishBtn = document.getElementById("publishBtn");
const newThreadBtn = document.getElementById("newThreadBtn");
const twistContainer = document.getElementById("twistContainer");

// Estado actual
let currentThread = null; // <div class="twist-list"> del hilo seleccionado
let currentThreadId = null; // ID de Firestore del hilo seleccionado
const threads = {}; // { [threadId]: { twistList: HTMLElement, title: HTMLElement } }

// ——— Función para alternar icono ▶️/▼ ———
function updateIcon(titleElem) {
  if (titleElem.textContent?.startsWith("▶️")) {
    titleElem.textContent = titleElem.textContent.replace("▶️", "▼");
  } else if (titleElem.textContent?.startsWith("▼")) {
    titleElem.textContent = titleElem.textContent.replace("▼", "▶️");
  }
}

// ——— Crea el elemento DOM para un twist (texto + botón “Editar”) ———
function createTwistElement(text) {
  const twist = document.createElement("div");
  twist.className = "twist";

  const p = document.createElement("p");
  p.textContent = text;
  twist.appendChild(p);

  // Botón Editar
  const editBtn = document.createElement("button");
  editBtn.textContent = "Editar";
  editBtn.className = "edit-btn";
  twist.appendChild(editBtn);

  editBtn.addEventListener("click", () => {
    // Reemplaza el párrafo por un textarea + botones Guardar/Cancelar
    const textarea = document.createElement("textarea");
    textarea.value = p.textContent;
    textarea.rows = 3;
    textarea.maxLength = 280;

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Guardar";
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancelar";

    twist.innerHTML = "";
    twist.appendChild(textarea);
    twist.appendChild(saveBtn);
    twist.appendChild(cancelBtn);

    saveBtn.addEventListener("click", async () => {
      const newText = textarea.value.trim();
      if (!newText) {
        alert("El twist no puede quedar vacío.");
        return;
      }
      p.textContent = newText;
      twist.innerHTML = "";
      twist.appendChild(p);
      twist.appendChild(editBtn);

      // Al editar un twist, actualizamos todo el arreglo en Firestore
      await updateThreadInFirestore(currentThreadId);
    });

    cancelBtn.addEventListener("click", () => {
      twist.innerHTML = "";
      twist.appendChild(p);
      twist.appendChild(editBtn);
    });
  });

  return twist;
}

// ——— Crea un nuevo hilo en Firestore y devuelve su ID ———
async function createNewThreadInFirestore() {
  const newThreadRef = doc(collection(db, "threads"));
  // Lo inicializamos con un campo "twists" (arreglo vacío)
  await setDoc(newThreadRef, { twists: [] });
  return newThreadRef.id;
}

// ——— Reemplaza el campo "twists" en Firestore para el hilo dado ———
async function updateThreadInFirestore(threadId) {
  if (!threadId) return;
  const threadRef = doc(db, "threads", threadId);

  // Recolectamos todos los textos de <div class="twist"> dentro de currentThread
  const twistsTexts = [];
  currentThread.querySelectorAll(".twist").forEach((twistElem) => {
    const p = twistElem.querySelector("p");
    if (p) twistsTexts.push(p.textContent);
  });

  // Sobrescribimos el arreglo “twists” en Firestore
  await updateDoc(threadRef, { twists: twistsTexts });
}

// ——— Escucha en tiempo real todos los hilos y construye la UI ———
function loadThreadsRealtime() {
  const threadsCollection = collection(db, "threads");

  onSnapshot(threadsCollection, (snapshot) => {
    // Vaciamos la sección de hilos y referencias
    twistContainer.innerHTML = "";
    Object.keys(threads).forEach((id) => delete threads[id]);

    snapshot.forEach((docSnap) => {
      const threadId = docSnap.id;
      const threadData = docSnap.data();

      // Creamos <div class="twist-thread">
      const threadDiv = document.createElement("div");
      threadDiv.className = "twist-thread";

      // Título del hilo
      const title = document.createElement("h3");
      title.className = "thread-title";
      title.textContent = `▶️ Hilo (${threadData.twists.length} twists)`;

      const titleWrapper = document.createElement("div");
      titleWrapper.style.display = "flex";
      titleWrapper.style.justifyContent = "space-between";
      titleWrapper.style.alignItems = "center";
      titleWrapper.appendChild(title);

      // Contenedor para los twists
      const twistList = document.createElement("div");
      twistList.className = "twist-list hidden";

      // Llenamos twistList con los textos que trae Firestore
      threadData.twists.forEach((twistText) => {
        const twistElem = createTwistElement(twistText);
        twistList.appendChild(twistElem);
      });

      // Al hacer clic en el título, mostramos/ocultamos twists y marcamos selección
      title.addEventListener("click", () => {
        twistList.classList.toggle("hidden");
        updateIcon(title);
        currentThread = twistList;
        currentThreadId = threadId;
        document
          .querySelectorAll(".twist-thread")
          .forEach((h) => h.classList.remove("selected-thread"));
        threadDiv.classList.add("selected-thread");
      });

      threadDiv.appendChild(titleWrapper);
      threadDiv.appendChild(twistList);
      twistContainer.appendChild(threadDiv);

      // Guardamos referencia DOM para poder actualizar el contador luego
      threads[threadId] = { twistList, title };
    });
  });
}

// ——— Evento: Publicar un twist en el hilo seleccionado ———
publishBtn.addEventListener("click", async () => {
  const twistText = twistInput.value.trim();
  if (!twistText) {
    alert("Por favor escribe un twist antes de publicar.");
    return;
  }
  if (!currentThread || !currentThreadId) {
    alert("Por favor selecciona un hilo o crea uno nuevo para publicar.");
    return;
  }

  // Agregamos el elemento al DOM de modo optimista
  const twistElem = createTwistElement(twistText);
  currentThread.appendChild(twistElem);

  // Actualizamos el contador en el título
  const threadDiv = currentThread.parentElement;
  const titleElem = threadDiv.querySelector(".thread-title");
  const count = currentThread.children.length;
  const icon = titleElem.textContent.startsWith("▼") ? "▼" : "▶️";
  titleElem.textContent = `${icon} Hilo (${count} twists)`;

  twistInput.value = "";

  // Luego guardamos el arreglo completo en Firestore
  await updateThreadInFirestore(currentThreadId);
});

// ——— Evento: Crear un nuevo hilo ———
newThreadBtn.addEventListener("click", async () => {
  // Crea el documento en Firestore y devuelve el ID
  const newThreadId = await createNewThreadInFirestore();

  // Al crear el hilo, onSnapshot lo detectará y aparecerá en la UI.
  // Reseteamos la selección para evitar confusiones:
  currentThread = null;
  currentThreadId = null;
});

// ——— Arrancamos la escucha en tiempo real de hilos ———
loadThreadsRealtime();
