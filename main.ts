// Referencias a elementos DOM
const twistInput = document.getElementById("twistInput") as HTMLTextAreaElement;
const publishBtn = document.getElementById("publishBtn") as HTMLButtonElement;
const newThreadBtn = document.getElementById("newThreadBtn") as HTMLButtonElement;
const twistContainer = document.getElementById("twistContainer") as HTMLElement;

let threadCount = 0;
let currentThread: HTMLElement | null = null;

// Función para actualizar icono de colapso/expansión
function updateIcon(title: HTMLElement) {
    if (title.textContent?.startsWith("▶️")) {
        title.textContent = title.textContent.replace("▶️", "▼");
    } else if (title.textContent?.startsWith("▼")) {
        title.textContent = title.textContent.replace("▼", "▶️");
    }
}

// Crear nuevo hilo
function createNewThread() {
    threadCount++;

    const thread = document.createElement("div");
    thread.className = "twist-thread";

    // Título con icono y contador inicial
    const title = document.createElement("h3");
    title.className = "thread-title";
    title.textContent = `▶️ Hilo #${threadCount} (0 twists)`;

    // Botón eliminar hilo
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.className = "delete-thread";

    // Wrapper para título y botón
    const titleWrapper = document.createElement("div");
    titleWrapper.style.display = "flex";
    titleWrapper.style.justifyContent = "space-between";
    titleWrapper.style.alignItems = "center";
    titleWrapper.appendChild(title);
    titleWrapper.appendChild(deleteBtn);

    // Contenedor de twists, oculto por defecto
    const twistList = document.createElement("div");
    twistList.className = "twist-list hidden";

    // Evento clic para expandir/colapsar y seleccionar hilo
    title.addEventListener("click", () => {
        twistList.classList.toggle("hidden");
        updateIcon(title);

        // Seleccionar hilo actual para publicar twists
        currentThread = twistList;

        // Resaltar hilo seleccionado
        document.querySelectorAll(".twist-thread").forEach(h => h.classList.remove("selected-thread"));
        thread.classList.add("selected-thread");
    });

    // Evento para eliminar hilo completo
    deleteBtn.addEventListener("click", () => {
        if (confirm("¿Estás seguro de eliminar este hilo completo?")) {
            if (currentThread === twistList) {
                currentThread = null; // Si eliminas el hilo seleccionado, deselecciona
            }
            thread.remove();
            saveToLocalStorage();
        }
    });

    thread.appendChild(titleWrapper);
    thread.appendChild(twistList);
    twistContainer.appendChild(thread);

    // Seleccionar hilo creado automáticamente y resaltarlo
    currentThread = twistList;
    document.querySelectorAll(".twist-thread").forEach(h => h.classList.remove("selected-thread"));
    thread.classList.add("selected-thread");

    saveToLocalStorage();
}

// Función para actualizar contador en título del hilo
function updateThreadCounter(twistList: HTMLElement) {
    const thread = twistList.parentElement;
    if (!thread) return;

    const count = twistList.children.length;
    const title = thread.querySelector(".thread-title");
    if (title) {
        // Cambiar el texto pero conservar icono y número hilo
        // Ej: "▼ Hilo #3 (5 twists)"
        const icon = title.textContent?.startsWith("▼") ? "▼" : "▶️";
        const parts = title.textContent?.split(" ");
        const hiloNum = parts && parts.length > 2 ? parts[2] : `#${threadCount}`;
        title.textContent = `${icon} ${hiloNum} (${count} twists)`;
    }
}

// Publicar twist en hilo seleccionado
publishBtn.addEventListener("click", () => {
    const twistText = twistInput.value.trim();
    if (!twistText) {
        alert("Por favor escribe un twist antes de publicar.");
        return;
    }
    if (!currentThread) {
        alert("Por favor selecciona un hilo o crea uno nuevo para publicar.");
        return;
    }

    const twist = document.createElement("div");
    twist.className = "twist";
    twist.textContent = twistText;

    currentThread.appendChild(twist);
    updateThreadCounter(currentThread);

    twistInput.value = "";
    saveToLocalStorage();
});

// Crear nuevo hilo
newThreadBtn.addEventListener("click", () => {
    createNewThread();
});

// Guardar todo en localStorage para persistencia
function saveToLocalStorage() {
    const threadsData: {id: number, twists: string[]}[] = [];

    document.querySelectorAll(".twist-thread").forEach((threadElem, index) => {
        const twistList = threadElem.querySelector(".twist-list");
        if (!twistList) return;
        const twistsTexts: string[] = [];
        twistList.querySelectorAll(".twist").forEach(twistElem => {
            twistsTexts.push(twistElem.textContent || "");
        });

        threadsData.push({
            id: index + 1,
            twists: twistsTexts,
        });
    });

    localStorage.setItem("twistThreads", JSON.stringify(threadsData));
    localStorage.setItem("threadCount", threadCount.toString());
}

// Cargar desde localStorage
function loadFromLocalStorage() {
    const storedThreads = localStorage.getItem("twistThreads");
    const storedCount = localStorage.getItem("threadCount");

    if (storedCount) {
        threadCount = parseInt(storedCount, 10);
    }

    if (storedThreads) {
        const threadsData: {id: number, twists: string[]}[] = JSON.parse(storedThreads);
        threadsData.forEach(threadData => {
            threadCount = Math.max(threadCount, threadData.id);

            const thread = document.createElement("div");
            thread.className = "twist-thread";

            const title = document.createElement("h3");
            title.className = "thread-title";
            title.textContent = `▶️ Hilo #${threadData.id} (${threadData.twists.length} twists)`;

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "🗑️";
            deleteBtn.className = "delete-thread";

            const titleWrapper = document.createElement("div");
            titleWrapper.style.display = "flex";
            titleWrapper.style.justifyContent = "space-between";
            titleWrapper.style.alignItems = "center";
            titleWrapper.appendChild(title);
            titleWrapper.appendChild(deleteBtn);

            const twistList = document.createElement("div");
            twistList.className = "twist-list hidden";

            // Cargar twists
            threadData.twists.forEach(twistText => {
                const twist = document.createElement("div");
                twist.className = "twist";
                twist.textContent = twistText;
                twistList.appendChild(twist);
            });

            // Eventos igual que en createNewThread
            title.addEventListener("click", () => {
                twistList.classList.toggle("hidden");
                updateIcon(title);

                currentThread = twistList;
                document.querySelectorAll(".twist-thread").forEach(h => h.classList.remove("selected-thread"));
                thread.classList.add("selected-thread");
            });

            deleteBtn.addEventListener("click", () => {
                if (confirm("¿Estás seguro de eliminar este hilo completo?")) {
                    if (currentThread === twistList) {
                        currentThread = null;
                    }
                    thread.remove();
                    saveToLocalStorage();
                }
            });

            thread.appendChild(titleWrapper);
            thread.appendChild(twistList);
            twistContainer.appendChild(thread);
        });
    }
}

// Cargar hilos guardados al inicio
loadFromLocalStorage();
