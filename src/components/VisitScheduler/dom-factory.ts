// DOM factory functions for creating UI elements
import type { WorkType } from "./scheduler.state";
import { utils } from "./scheduler.utils";

export const DOMFactory = {
  createWorkTypeCard(
    workType: WorkType,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = utils.createElement(
      "button",
      {
        type: "button",
        "data-id": workType.id.toString(),
        role: "radio",
        "aria-checked": "false",
      },
      [
        "text-left",
        "p-4",
        "border-2",
        "border-slate-100",
        "rounded-xl",
        "hover:border-blue-500",
        "hover:bg-blue-50",
        "transition-all",
        "duration-200",
        "flex",
        "justify-between",
        "items-center",
        "group",
        "cursor-pointer",
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-blue-500",
      ],
    );

    const contentDiv = utils.createElement("div");

    const title = utils.createElement("p", {}, ["font-bold", "text-slate-800"]);
    title.textContent = workType.name;
    contentDiv.appendChild(title);

    if (workType.description) {
      const desc = utils.createElement("p", {}, [
        "text-xs",
        "text-slate-500",
        "mt-1",
      ]);
      desc.textContent = workType.description;
      contentDiv.appendChild(desc);
    }

    const icon = utils.createElement("span", {}, [
      "w-6",
      "h-6",
      "rounded-full",
      "border",
      "border-slate-300",
      "group-hover:border-blue-500",
      "flex",
      "items-center",
      "justify-center",
      "text-xs",
      "transition-colors",
    ]);
    icon.textContent = "→";

    button.appendChild(contentDiv);
    button.appendChild(icon);
    button.addEventListener("click", onClick);

    return button;
  },

  createDayCell(
    day: number,
    dateStr: string,
    isPast: boolean,
    onClick: () => void,
  ): HTMLDivElement {
    const baseClasses = [
      "p-2",
      "text-sm",
      "font-medium",
      "transition-all",
      "duration-150",
    ];
    const interactiveClasses = isPast
      ? ["text-slate-300", "cursor-not-allowed"]
      : ["hover:bg-blue-100", "cursor-pointer", "rounded-full"];

    const cell = utils.createElement(
      "div",
      {
        "data-date": dateStr,
        ...(isPast ? {} : { role: "button", tabindex: "0" }),
      },
      [...baseClasses, ...interactiveClasses],
    );

    cell.textContent = day.toString();

    if (!isPast) {
      cell.addEventListener("click", onClick);
    }

    return cell;
  },

  createTimeSlot(time: string, onClick: () => void): HTMLButtonElement {
    const button = utils.createElement(
      "button",
      {
        type: "button",
        "data-time": time,
        role: "radio",
        "aria-checked": "false",
      },
      [
        "border",
        "border-slate-200",
        "rounded-lg",
        "p-2",
        "text-sm",
        "hover:border-blue-500",
        "hover:bg-blue-50",
        "transition-all",
        "duration-150",
        "cursor-pointer",
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-blue-500",
      ],
    );

    button.textContent = time;
    button.addEventListener("click", onClick);

    return button;
  },

  createLoadingMessage(message: string): HTMLParagraphElement {
    const p = utils.createElement("p", {}, [
      "col-span-3",
      "text-center",
      "py-4",
      "animate-pulse",
      "text-slate-400",
    ]);
    p.textContent = message;
    return p;
  },

  createErrorMessage(message: string): HTMLParagraphElement {
    const p = utils.createElement("p", {}, [
      "col-span-3",
      "text-sm",
      "text-red-500",
      "text-center",
      "py-4",
      "italic",
    ]);
    p.textContent = message;
    return p;
  },

  createSummaryItem(label: string, value: string): HTMLLIElement {
    const li = utils.createElement("li");

    const strong = utils.createElement("strong");
    strong.textContent = `${label}: `;

    li.appendChild(strong);
    li.appendChild(document.createTextNode(value));

    return li;
  },
};
