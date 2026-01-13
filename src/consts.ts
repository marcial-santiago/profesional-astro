// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

import type { ServiceAll } from "./interfaces/services";

export const SITE_TITLE = "Astro Blog";
export const SITE_DESCRIPTION = "Welcome to my website!";

export const SERVICE_DATA: ServiceAll = {
  services: [
    {
      nameUrl: "cleaning",
      urlImage:
        "https://media.istockphoto.com/id/1417833187/photo/professional-cleaner-vacuuming-a-carpet.jpg?s=612x612&w=0&k=20&c=5h8NBR190d46Ni4MclqJ7Zf9ZOtf3TM3gPRJaHUdMjk=",
      sectionTitle: "Cleaning Services",
      sectionSubtitle:
        "We offer professional cleaning services for homes and offices.",
      subTitle: "Our Commitments",
      subText:
        "In every service, we guarantee professionalism, efficiency, and impeccable results. Your satisfaction is our priority.",
      items: [
        {
          id: 1,
          title: "Residential Cleaning",
          description:
            "Comprehensive home cleaning service, adaptable to your needs.",
          image: "/images/cleaning-residential.jpg",
          cta: "Request Quote",
        },
        {
          id: 2,
          title: "Commercial Cleaning",
          description:
            "We keep your workspace spotless, contributing to a productive environment.",
          image: "/images/cleaning-commercial.jpg",
          cta: "Request Quote",
        },
        {
          id: 3,
          title: "Deep Cleaning",
          description:
            "A detailed service for thorough cleaning of every corner.",
          image: "/images/cleaning-deep.jpg",
          cta: "Request Quote",
        },
        {
          id: 4,
          title: "Post-Construction Cleaning",
          description:
            "We remove debris and dust after any construction or renovation project.",
          image: "/images/cleaning-post-construction.jpg",
          cta: "Request Quote",
        },
      ],
    },
    {
      nameUrl: "plumbing",
      urlImage:
        "https://www.jkfm.com.au/wp-content/uploads/shutterstock_1024475122-scaled.jpg",
      sectionTitle: "Plumbing Services",
      sectionSubtitle:
        "Comprehensive plumbing solutions for your home or business.",
      subTitle: "Plumbing Experts",
      subText:
        "From minor repairs to full installations, our certified plumbers ensure quality work.",
      items: [
        {
          id: 1,
          title: "Leak Repairs",
          description:
            "Efficient identification and repair of pipe and faucet leaks.",
          image: "/images/plumbing-leaks.jpg",
          cta: "Request Service",
        },
        {
          id: 2,
          title: "Pipe Installation",
          description:
            "Professional installation of pipe systems for new builds or renovations.",
          image: "/images/plumbing-pipes.jpg",
          cta: "Request Service",
        },
        {
          id: 3,
          title: "Drain Unclogging",
          description:
            "Fast and effective service to unclog drains and pipes.",
          image: "/images/plumbing-drainage.jpg",
          cta: "Request Service",
        },
      ],
    },
    {
      nameUrl: "construction",
      urlImage:
        "https://media.istockphoto.com/id/1657566602/photo/two-construction-workers-working-together-on-an-apartment-renovation.jpg?s=612x612&w=0&k=20&c=9U8I8t_7rljrVhCCQHACecXooE0_iJ7bTvlXp7WDNXs=",
      sectionTitle: "Construction Services",
      sectionSubtitle:
        "We build your dreams with quality, efficiency, and attention to detail.",
      subTitle: "Tailored Projects",
      subText:
        "From planning to final execution, we handle every stage of your construction project.",
      items: [
        {
          id: 1,
          title: "Residential Construction",
          description:
            "Development of single-family and multi-family homes tailored to your preferences.",
          image: "/images/construction-residential.jpg",
          cta: "Start Project",
        },
        {
          id: 2,
          title: "Commercial Construction",
          description:
            "Development of functional and aesthetic commercial spaces for your business.",
          image: "/images/construction-commercial.jpg",
          cta: "Start Project",
        },
        {
          id: 3,
          title: "Remodeling and Additions",
          description:
            "We transform and expand your existing spaces, giving them new life.",
          image: "/images/construction-remodel.jpg",
          cta: "Start Project",
        },
      ],
    },
  ],
};
