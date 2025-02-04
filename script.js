// ==========================================
// VARIABLES Y CONSTANTES GLOBALES
// ==========================================
const scheduleContainer = document.getElementById('scheduleContainer');
// Cada hora se representa en 50px (cuadrícula total 1200px)
const slotHeight = 50;
let totalScheduledHours = 0;
const availableHoursElem = document.getElementById('availableHours');

// Registro de actividades programadas. Cada registro es un objeto con:
// id, start, duration, source (id del sidebar), elementPart1, elementPart2 (si cruza), color, description.
const scheduledActivities = [];

// Variables para el menú contextual
const contextMenu = document.getElementById('contextMenu');
let currentContextElem = null;
let currentContextType = null; // "sidebar" o "schedule"

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

// Actualiza el contador de horas disponibles
function updateAvailableHours() {
  const remaining = 24 - totalScheduledHours;
  availableHoursElem.textContent = 'Horas disponibles: ' + remaining;
}

// Dibuja la cuadrícula horaria (24 horas) en el contenedor
function drawGrid() {
  for (let i = 0; i < 24; i++) {
    const line = document.createElement('div');
    line.classList.add('hour-line');
    line.style.top = (i * slotHeight) + 'px';
    line.style.height = slotHeight + 'px';

    const label = document.createElement('div');
    label.classList.add('hour-label');
    label.textContent = (i < 10 ? '0' + i : i) + ':00';
    line.appendChild(label);
    scheduleContainer.appendChild(line);
  }
}
drawGrid();

// Función que retorna los intervalos de una actividad
// Si no cruza la medianoche: [[start, start+duration]]
// Si cruza: [[start, 24], [0, (start+duration)-24]]
function getActivityIntervals(start, duration) {
  const end = start + duration;
  if (end <= 24) {
    return [[start, end]];
  } else {
    return [[start, 24], [0, end - 24]];
  }
}

// Verifica si dos conjuntos de intervalos se solapan
function intervalsOverlap(intervals1, intervals2) {
  for (const [s1, e1] of intervals1) {
    for (const [s2, e2] of intervals2) {
      if (!(e1 <= s2 || s1 >= e2)) {
        return true;
      }
    }
  }
  return false;
}

// ==========================================
// INDICADOR DE HORA ACTUAL
// ==========================================

const timeIndicator = document.getElementById('timeIndicator');
function updateTimeIndicator() {
  const now = new Date();
  // Convertir la hora actual a "hora en el horario" (0 a 24)
  const currentHour = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
  // Calcular el "top" en base a slotHeight (la cuadrícula interna tiene 24 horas = 1200px)
  const topPos = currentHour * slotHeight;
  timeIndicator.style.top = topPos + 'px';
}
updateTimeIndicator();
setInterval(updateTimeIndicator, 1000);

// ==========================================
// FUNCIONALIDAD DE DRAG & DROP EN EL HORARIO
// ==========================================

// Se ajusta la posición usando scheduleContainer.scrollTop para el offset correcto.
scheduleContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
});

scheduleContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  const rect = scheduleContainer.getBoundingClientRect();
  const offsetY = e.clientY - rect.top + scheduleContainer.scrollTop;
  const newStartHour = Math.floor(offsetY / slotHeight);

  const transferId = e.dataTransfer.getData('text/plain');
  let draggedElem = document.getElementById(transferId);
  if (!draggedElem) {
    draggedElem = document.querySelector(`[data-container-id="${transferId}"]`);
  }
  if (!draggedElem) return;

  // Diferenciar entre actividad nueva (del sidebar) y ya programada
  if (draggedElem.classList.contains('activity')) {
    scheduleNewActivity(draggedElem, newStartHour);
  } else {
    const containerId = draggedElem.dataset.containerId;
    if (!containerId) return;
    repositionScheduledActivity(containerId, newStartHour);
  }
});

// Programa una actividad nueva en el horario
function scheduleNewActivity(activityElem, startHour) {
  const duration = parseInt(activityElem.dataset.duration);
  const color = activityElem.dataset.color || "#4CAF50";
  const description = activityElem.dataset.description || "";
  const newIntervals = getActivityIntervals(startHour, duration);

  // Verificar solapamientos
  for (const act of scheduledActivities) {
    const actIntervals = getActivityIntervals(act.start, act.duration);
    if (intervalsOverlap(newIntervals, actIntervals)) {
      alert('Conflicto con otra actividad programada.');
      return;
    }
  }

  const containerId = 'scheduled-' + Date.now();
  let elementPart1, elementPart2 = null;
  if (newIntervals.length === 1) {
    elementPart1 = document.createElement('div');
    elementPart1.classList.add('scheduled-activity');
    elementPart1.textContent = activityElem.textContent;
    elementPart1.style.top = (startHour * slotHeight) + 'px';
    elementPart1.style.height = (duration * slotHeight - 4) + 'px';
    elementPart1.style.backgroundColor = color;
    elementPart1.dataset.containerId = containerId;
    elementPart1.setAttribute('draggable', 'true');
    addScheduledDragEvents(elementPart1);
    scheduleContainer.appendChild(elementPart1);
  } else {
    // Si cruza la medianoche
    const part1Duration = 24 - startHour;
    const part2Duration = duration - part1Duration;
    elementPart1 = document.createElement('div');
    elementPart1.classList.add('scheduled-activity');
    elementPart1.textContent = activityElem.textContent;
    elementPart1.style.top = (startHour * slotHeight) + 'px';
    elementPart1.style.height = (part1Duration * slotHeight - 4) + 'px';
    elementPart1.style.backgroundColor = color;
    elementPart1.dataset.containerId = containerId;
    elementPart1.setAttribute('draggable', 'true');
    addScheduledDragEvents(elementPart1);
    scheduleContainer.appendChild(elementPart1);
    
    elementPart2 = document.createElement('div');
    elementPart2.classList.add('scheduled-activity');
    elementPart2.textContent = activityElem.textContent;
    elementPart2.style.top = 0 + 'px';
    elementPart2.style.height = (part2Duration * slotHeight - 4) + 'px';
    elementPart2.style.backgroundColor = color;
    elementPart2.dataset.containerId = containerId;
    elementPart2.setAttribute('draggable', 'true');
    addScheduledDragEvents(elementPart2);
    scheduleContainer.appendChild(elementPart2);
  }
  
  scheduledActivities.push({
    id: containerId,
    start: startHour,
    duration: duration,
    source: activityElem.id,
    elementPart1: elementPart1,
    elementPart2: elementPart2,
    color: color,
    description: description
  });
  totalScheduledHours += duration;
  updateAvailableHours();
}

// Reubica una actividad ya programada (por containerId)
function repositionScheduledActivity(containerId, newStartHour) {
  const actIndex = scheduledActivities.findIndex(a => a.id === containerId);
  if (actIndex === -1) return;
  const currentAct = scheduledActivities[actIndex];
  const newIntervals = getActivityIntervals(newStartHour, currentAct.duration);
  for (const act of scheduledActivities) {
    if (act.id === currentAct.id) continue;
    const actIntervals = getActivityIntervals(act.start, act.duration);
    if (intervalsOverlap(newIntervals, actIntervals)) {
      alert('Conflicto con otra actividad programada.');
      return;
    }
  }
  if (newIntervals.length === 1) {
    if (currentAct.elementPart2) {
      scheduleContainer.removeChild(currentAct.elementPart2);
      currentAct.elementPart2 = null;
    }
    currentAct.elementPart1.style.top = (newStartHour * slotHeight) + 'px';
  } else {
    const part1Duration = 24 - newStartHour;
    const part2Duration = currentAct.duration - part1Duration;
    currentAct.elementPart1.style.top = (newStartHour * slotHeight) + 'px';
    currentAct.elementPart1.style.height = (part1Duration * slotHeight - 4) + 'px';
    if (currentAct.elementPart2) {
      currentAct.elementPart2.style.top = 0 + 'px';
      currentAct.elementPart2.style.height = (part2Duration * slotHeight - 4) + 'px';
    } else {
      const newElem2 = document.createElement('div');
      newElem2.classList.add('scheduled-activity');
      newElem2.textContent = currentAct.elementPart1.textContent;
      newElem2.style.top = 0 + 'px';
      newElem2.style.height = (part2Duration * slotHeight - 4) + 'px';
      newElem2.style.backgroundColor = currentAct.color;
      newElem2.dataset.containerId = containerId;
      newElem2.setAttribute('draggable', 'true');
      addScheduledDragEvents(newElem2);
      scheduleContainer.appendChild(newElem2);
      currentAct.elementPart2 = newElem2;
    }
  }
  currentAct.start = newStartHour;
  updateAvailableHours();
}

// Agrega eventos de drag y menú contextual a un elemento programado
function addScheduledDragEvents(elem) {
  elem.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', elem.dataset.containerId);
    elem.classList.add('dragging');
  });
  elem.addEventListener('dragend', () => {
    elem.classList.remove('dragging');
  });
  elem.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e.pageX, e.pageY, elem, "schedule");
  });
}

// ==========================================
// CREACIÓN DE ACTIVIDADES EN EL SIDEBAR
// ==========================================
const addActivityBtn = document.getElementById('addActivityBtn');
const activityList = document.getElementById('activityList');
let activityCount = 0;

addActivityBtn.addEventListener('click', () => {
  const name = document.getElementById('activityName').value.trim();
  const duration = parseInt(document.getElementById('activityDuration').value);
  const description = document.getElementById('activityDescription').value.trim();
  const color = document.getElementById('activityColor').value;
  
  if (!name || isNaN(duration) || duration < 1 || duration > 24) {
    alert('Por favor, ingresa un nombre válido y una duración entre 1 y 24.');
    return;
  }
  
  // Crear el elemento del sidebar (actividad arrastrable)
  const activityElem = document.createElement('div');
  activityElem.classList.add('activity');
  activityElem.textContent = name + ' (' + duration + 'h)' + (description ? ' - ' + description : '');
  activityElem.id = 'activity-' + activityCount++;
  activityElem.dataset.duration = duration;
  activityElem.dataset.color = color;
  activityElem.dataset.description = description;
  // Mostrar el color seleccionado en el fondo de la actividad (puedes ajustar según tu diseño)
  activityElem.style.background = `linear-gradient(90deg, ${color} 3%, #333 3%)`;
  ;
  
  activityElem.setAttribute('draggable', 'true');
  activityElem.addEventListener('dragstart', (e) => {
    activityElem.classList.add('dragging');
    e.dataTransfer.setData('text/plain', activityElem.id);
  });
  activityElem.addEventListener('dragend', () => {
    activityElem.classList.remove('dragging');
  });
  activityElem.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e.pageX, e.pageY, activityElem, "sidebar");
  });
  
  activityList.appendChild(activityElem);
  document.getElementById('activityName').value = '';
  document.getElementById('activityDuration').value = '';
  document.getElementById('activityDescription').value = '';
});
  
// ==========================================
// MENÚ CONTEXTUAL (para Sidebar y Horario)
// ==========================================
function showContextMenu(x, y, targetElem, type) {
  currentContextElem = targetElem;
  currentContextType = type; // "sidebar" o "schedule"
  contextMenu.style.display = 'block';
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
}
  
document.addEventListener('click', (e) => {
  if (!e.target.closest('.context-menu')) {
    contextMenu.style.display = 'none';
  }
});
  
// Opción Editar
document.getElementById('editOption').addEventListener('click', () => {
  if (!currentContextElem) return;
  if (currentContextType === "sidebar") {
    // Editar actividad en el sidebar. Si ya está programada, se elimina para evitar conflictos.
    const currentText = currentContextElem.textContent;
    const currentName = currentText.split(' (')[0];
    const currentDuration = currentContextElem.dataset.duration;
    const newName = prompt('Nuevo nombre:', currentName);
    if (newName === null) return;
    const newDuration = prompt('Nueva duración (horas):', currentDuration);
    const durationNum = parseInt(newDuration);
    if (!newName.trim() || isNaN(durationNum) || durationNum < 1 || durationNum > 24) {
      alert('Datos inválidos.');
      return;
    }
    const newDescription = prompt('Nueva descripción (opcional):', currentContextElem.dataset.description) || "";
    currentContextElem.textContent = newName + ' (' + durationNum + 'h)' + (newDescription ? ' - ' + newDescription : '');
    currentContextElem.dataset.duration = durationNum;
    currentContextElem.dataset.description = newDescription;
    contextMenu.style.display = 'none';
    // Eliminar todas las instancias programadas de esta actividad (si existen)
    for (let i = scheduledActivities.length - 1; i >= 0; i--) {
      if (scheduledActivities[i].source === currentContextElem.id) {
        if (scheduledActivities[i].elementPart1)
          scheduleContainer.removeChild(scheduledActivities[i].elementPart1);
        if (scheduledActivities[i].elementPart2)
          scheduleContainer.removeChild(scheduledActivities[i].elementPart2);
        totalScheduledHours -= scheduledActivities[i].duration;
        scheduledActivities.splice(i, 1);
      }
    }
    updateAvailableHours();
  } else if (currentContextType === "schedule") {
    // Editar actividad programada (sólo esta instancia)
    const actRecord = scheduledActivities.find(a => a.id === currentContextElem.dataset.containerId);
    if (!actRecord) return;
    const currentText = currentContextElem.textContent;
    const currentName = currentText.split(' (')[0];
    const newName = prompt('Nuevo nombre:', currentName);
    if (newName === null) return;
    const newDuration = prompt('Nueva duración (horas):', actRecord.duration);
    const durationNum = parseInt(newDuration);
    if (!newName.trim() || isNaN(durationNum) || durationNum < 1 || durationNum > 24) {
      alert('Datos inválidos.');
      return;
    }
    const newDescription = prompt('Nueva descripción (opcional):', actRecord.description) || "";
    const newIntervals = getActivityIntervals(actRecord.start, durationNum);
    for (const act of scheduledActivities) {
      if (act.id === actRecord.id) continue;
      const actIntervals = getActivityIntervals(act.start, act.duration);
      if (intervalsOverlap(newIntervals, actIntervals)) {
        alert('Conflicto con otra actividad programada.');
        return;
      }
    }
    actRecord.duration = durationNum;
    actRecord.description = newDescription;
    if (newIntervals.length === 1) {
      if (actRecord.elementPart2) {
        scheduleContainer.removeChild(actRecord.elementPart2);
        actRecord.elementPart2 = null;
      }
      actRecord.elementPart1.style.height = (durationNum * slotHeight - 4) + 'px';
    } else {
      const part1Duration = 24 - actRecord.start;
      const part2Duration = durationNum - part1Duration;
      actRecord.elementPart1.style.height = (part1Duration * slotHeight - 4) + 'px';
      if (actRecord.elementPart2) {
        actRecord.elementPart2.style.height = (part2Duration * slotHeight - 4) + 'px';
      } else {
        const newElem2 = document.createElement('div');
        newElem2.classList.add('scheduled-activity');
        newElem2.textContent = newName + ' (' + durationNum + 'h)';
        newElem2.style.top = 0 + 'px';
        newElem2.style.height = (part2Duration * slotHeight - 4) + 'px';
        newElem2.style.backgroundColor = actRecord.color;
        newElem2.dataset.containerId = actRecord.id;
        newElem2.setAttribute('draggable', 'true');
        addScheduledDragEvents(newElem2);
        scheduleContainer.appendChild(newElem2);
        actRecord.elementPart2 = newElem2;
      }
    }
    actRecord.elementPart1.textContent = newName + ' (' + durationNum + 'h)' + (newDescription ? ' - ' + newDescription : '');
    if (actRecord.elementPart2)
      actRecord.elementPart2.textContent = newName + ' (' + durationNum + 'h)' + (newDescription ? ' - ' + newDescription : '');
    totalScheduledHours = totalScheduledHours - actRecord.duration + durationNum;
    updateAvailableHours();
    contextMenu.style.display = 'none';
  }
});
  
// Opción Eliminar en el menú contextual
document.getElementById('deleteOption').addEventListener('click', () => {
  if (!currentContextElem) return;
  if (currentContextType === "sidebar") {
    const sidebarId = currentContextElem.id;
    for (let i = scheduledActivities.length - 1; i >= 0; i--) {
      if (scheduledActivities[i].source === sidebarId) {
        if (scheduledActivities[i].elementPart1)
          scheduleContainer.removeChild(scheduledActivities[i].elementPart1);
        if (scheduledActivities[i].elementPart2)
          scheduleContainer.removeChild(scheduledActivities[i].elementPart2);
        totalScheduledHours -= scheduledActivities[i].duration;
        scheduledActivities.splice(i, 1);
      }
    }
    currentContextElem.remove();
    updateAvailableHours();
    contextMenu.style.display = 'none';
  } else if (currentContextType === "schedule") {
    const containerId = currentContextElem.dataset.containerId;
    const actIndex = scheduledActivities.findIndex(a => a.id === containerId);
    if (actIndex !== -1) {
      const actRecord = scheduledActivities[actIndex];
      if (actRecord.elementPart1)
        scheduleContainer.removeChild(actRecord.elementPart1);
      if (actRecord.elementPart2)
        scheduleContainer.removeChild(actRecord.elementPart2);
      totalScheduledHours -= actRecord.duration;
      scheduledActivities.splice(actIndex, 1);
      updateAvailableHours();
    }
    contextMenu.style.display = 'none';
  }
});
  
// ==========================================
// BOTONES DE CONTROLES GLOBALES
// ==========================================

// Modo oscuro / claro
const toggleModeBtn = document.getElementById('toggleModeBtn');
toggleModeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  toggleModeBtn.textContent = document.body.classList.contains('dark-mode') ? "Modo Claro" : "Modo Oscuro";
});

// Botón para eliminar todas las actividades
const deleteAllBtn = document.getElementById('deleteAllBtn');
deleteAllBtn.addEventListener('click', () => {
  if (confirm("¿Deseas eliminar TODAS las actividades?")) {
    // Remover todas las actividades programadas
    scheduledActivities.forEach(act => {
      if (act.elementPart1) scheduleContainer.removeChild(act.elementPart1);
      if (act.elementPart2) scheduleContainer.removeChild(act.elementPart2);
    });
    scheduledActivities.length = 0;
    totalScheduledHours = 0;
    updateAvailableHours();
    // Remover todas las actividades del sidebar
    activityList.innerHTML = "";
  }
});

// Botón para guardar el horario como imagen
// Botón para guardar el horario como imagen
const saveScheduleBtn = document.getElementById('saveScheduleBtn');
saveScheduleBtn.addEventListener('click', () => {
  // Usamos setTimeout para esperar un poco antes de hacer la captura
  setTimeout(() => {
    const scheduleContainer = document.getElementById('scheduleContainer');
    const scheduleHeight = scheduleContainer.scrollHeight;
    const scheduleWidth = scheduleContainer.scrollWidth;

    // Usamos html2canvas para capturar el contenedor del horario
    html2canvas(scheduleContainer, {
      scrollY: -window.scrollY,  // Ajuste para capturar contenido fuera de vista
      scrollX: 0,  // Aseguramos que el desplazamiento horizontal esté en 0
      useCORS: true,  // Permite capturar imágenes externas si es necesario
      width: scheduleWidth,  // Ajuste del tamaño
      height: scheduleHeight,  // Ajuste del tamaño
      x: 0,  // Ajuste para asegurarse que se inicie desde la parte superior
      y: 0,  // Ajuste para asegurarse que se inicie desde la parte izquierda
    }).then(canvas => {
      // Convertir el canvas a imagen y forzar descarga
      const imageData = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = imageData;
      link.download = 'horario.png';
      link.click();
    });
  }, 500);  // Espera medio segundo para asegurarse de que todo se haya renderizado
});



