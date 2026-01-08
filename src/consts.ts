// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

import type { ServiceAll } from "./interfaces/services";

export const SITE_TITLE = "Astro Blog";
export const SITE_DESCRIPTION = "Welcome to my website!";

export const SERVICE_DATA: ServiceAll = {
  services: [
    {
      nameUrl: "limpieza",
      urlImage:
        "https://images.unsplash.com/photo-1761839258671-6495fdc188b3?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      sectionTitle: "Servicio de Limpieza",
      sectionSubtitle:
        "Ofrecemos servicios de limpieza profesional para hogares y oficinas.",
      subTitle: "Nuestros Compromisos",
      subText:
        "En cada servicio, garantizamos profesionalismo, eficiencia y resultados impecables. Su satisfacción es nuestra prioridad.",
      items: [
        {
          id: 1,
          title: "Limpieza Residencial",
          description:
            "Servicio completo de limpieza para tu hogar, adaptable a tus necesidades.",
          image: "/images/cleaning-residential.jpg",
          cta: "Solicitar Presupuesto",
        },
        {
          id: 2,
          title: "Limpieza Comercial",
          description:
            "Mantenemos tu espacio de trabajo impecable, contribuyendo a un ambiente productivo.",
          image: "/images/cleaning-commercial.jpg",
          cta: "Solicitar Presupuesto",
        },
        {
          id: 3,
          title: "Limpieza Profunda",
          description:
            "Un servicio detallado para una limpieza a fondo de cada rincón.",
          image: "/images/cleaning-deep.jpg",
          cta: "Solicitar Presupuesto",
        },
        {
          id: 4,
          title: "Limpieza Post-Obra",
          description:
            "Eliminamos escombros y polvo después de cualquier proyecto de construcción o renovación.",
          image: "/images/cleaning-post-construction.jpg",
          cta: "Solicitar Presupuesto",
        },
      ],
    },
    {
      nameUrl: "plomeria",
      urlImage:
        "https://images.unsplash.com/photo-1761839258671-6495fdc188b3?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      sectionTitle: "Servicio de Plomería",
      sectionSubtitle:
        "Soluciones integrales de plomería para su hogar o negocio.",
      subTitle: "Expertos en Plomería",
      subText:
        "Desde reparaciones menores hasta instalaciones completas, nuestro equipo de plomeros certificados garantiza un trabajo de calidad.",
      items: [
        {
          id: 1,
          title: "Reparación de Fugas",
          description:
            "Identificación y reparación eficiente de fugas en tuberías y grifos.",
          image: "/images/plumbing-leaks.jpg",
          cta: "Solicitar Servicio",
        },
        {
          id: 2,
          title: "Instalación de Tuberías",
          description:
            "Instalación profesional de sistemas de tuberías para construcciones nuevas o renovaciones.",
          image: "/images/plumbing-pipes.jpg",
          cta: "Solicitar Servicio",
        },
        {
          id: 3,
          title: "Desatascos de Drenajes",
          description:
            "Servicio rápido y efectivo para desatascar drenajes y desagües.",
          image: "/images/plumbing-drainage.jpg",
          cta: "Solicitar Servicio",
        },
      ],
    },
    {
      nameUrl: "construccion",
      urlImage:
        "https://images.unsplash.com/photo-1761839258671-6495fdc188b3?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      sectionTitle: "Servicio de Construcción",
      sectionSubtitle:
        "Construimos sus sueños con calidad, eficiencia y atención al detalle.",
      subTitle: "Proyectos a Medida",
      subText:
        "Desde la planificación hasta la ejecución final, nos encargamos de cada etapa de su proyecto de construcción.",
      items: [
        {
          id: 1,
          title: "Construcción Residencial",
          description:
            "Creación de viviendas unifamiliares y multifamiliares adaptadas a sus preferencias.",
          image: "/images/construction-residential.jpg",
          cta: "Iniciar Proyecto",
        },
        {
          id: 2,
          title: "Construcción Comercial",
          description:
            "Desarrollo de espacios comerciales funcionales y estéticos para su negocio.",
          image: "/images/construction-commercial.jpg",
          cta: "Iniciar Proyecto",
        },
        {
          id: 3,
          title: "Remodelaciones y Ampliaciones",
          description:
            "Transformamos y ampliamos sus espacios existentes, dándoles una nueva vida.",
          image: "/images/construction-remodel.jpg",
          cta: "Iniciar Proyecto",
        },
      ],
    },
  ],
};
