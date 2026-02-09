// Calendar rendering and interaction logic
import { utils } from "./scheduler.utils";
import { DOMFactory } from "./dom-factory";

export class Calendar {
  private container: HTMLElement;
  private onDateSelect: (date: string) => void;

  constructor(container: HTMLElement, onDateSelect: (date: string) => void) {
    this.container = container;
    this.onDateSelect = onDateSelect;
  }

  render(): void {
    utils.clearElement(this.container);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    // Header
    const header = utils.createElement("div", {}, [
      "text-center",
      "font-bold",
      "mb-4",
      "text-slate-800",
    ]);
    header.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    this.container.appendChild(header);

    // Week days
    const weekDays = utils.createElement("div", {}, [
      "grid",
      "grid-cols-7",
      "gap-1",
      "text-center",
      "text-xs",
      "font-bold",
      "text-slate-400",
      "mb-2",
    ]);
    ["D", "L", "M", "M", "J", "V", "S"].forEach((day) => {
      const dayDiv = utils.createElement("div");
      dayDiv.textContent = day;
      weekDays.appendChild(dayDiv);
    });
    this.container.appendChild(weekDays);

    // Days grid
    const daysGrid = utils.createElement("div", {}, [
      "grid",
      "grid-cols-7",
      "gap-1",
      "text-center",
    ]);

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      daysGrid.appendChild(utils.createElement("div"));
    }

    // Day cells
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const fragment = document.createDocumentFragment();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isPast = date < todayDate;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const cell = DOMFactory.createDayCell(day, dateStr, isPast, () =>
        this.onDateSelect(dateStr),
      );
      fragment.appendChild(cell);
    }

    daysGrid.appendChild(fragment);
    this.container.appendChild(daysGrid);
  }

  highlightDate(date: string): void {
    document.querySelectorAll("div[data-date]").forEach((cell) => {
      const isSelected = cell.getAttribute("data-date") === date;
      if (isSelected) {
        cell.classList.add("bg-blue-600", "text-white");
        cell.classList.remove("hover:bg-blue-100");
      } else {
        cell.classList.remove("bg-blue-600", "text-white");
        if (!cell.classList.contains("text-slate-300")) {
          cell.classList.add("hover:bg-blue-100");
        }
      }
    });
  }
}
