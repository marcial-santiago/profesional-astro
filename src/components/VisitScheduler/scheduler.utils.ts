// Utility functions for the visit scheduler

export const utils = {
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("es-AR", options);
  },

  validatePhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    return /^[\+]?[\d]{8,15}$/.test(cleaned);
  },

  validateName(name: string): boolean {
    return name.trim().length >= 3 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name);
  },

  createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attributes?: Record<string, string>,
    classes?: string[],
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);

    if (classes) {
      element.classList.add(...classes);
    }

    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    return element;
  },

  clearElement(element: Element): void {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  },
};
