// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

import type { ServiceAll } from "./interfaces/services";

export const SITE_TITLE = "Roldans Multiservices";
export const SITE_DESCRIPTION =
  "Professional house maintenance services across Queensland — cleaning, gardening, concreting, and removalist.";

// Default price in USD for any service not explicitly priced
export const DEFAULT_SERVICE_PRICE = 10;

export const SERVICE_DATA: ServiceAll = {
  services: [
    {
      nameUrl: "cleaning",
      urlImage: "/images/cleaning-main.jpg",
      sectionTitle: "Cleaning Services",
      sectionSubtitle:
        "Professional cleaning for homes, offices, and commercial spaces.",
      subTitle: "Our Cleaning Guarantee",
      subText:
        "We use professional-grade equipment and eco-friendly products to deliver spotless results every time.",
      items: [
        {
          id: 1,
          title: "House Cleaning",
          description: "Thorough home cleaning service tailored to your needs.",
          image: "/images/cleaning-house.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 2,
          title: "Office Cleaning",
          description: "Keep your workspace clean and productive.",
          image: "/images/cleaning-office.png",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 3,
          title: "After Builders Cleaning",
          description: "Post-construction debris and dust removal.",
          image: "/images/cleaning-after-builders.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 4,
          title: "End of Lease Cleaning",
          description:
            "Get your bond back with our thorough end-of-lease service.",
          image: "/images/cleaning-end-of-lease.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 5,
          title: "Oven Cleaning",
          description:
            "Deep oven cleaning to remove built-up grease and grime.",
          image: "/images/cleaning-oven.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 6,
          title: "BBQ Cleaning",
          description:
            "Professional BBQ cleaning to keep it looking and cooking like new.",
          image: "/images/cleaning-bbq.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 7,
          title: "Pressure Wash Cleaning",
          description:
            "High-pressure cleaning for driveways, patios, and exterior walls.",
          image: "/images/cleaning-pressure-wash.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 8,
          title: "Upholstery & Carpet Cleaning",
          description: "Steam cleaning for upholstery, carpets, and rugs.",
          image: "/images/cleaning-carpet.jpg",
          cta: "Request Quote",
          price: 10,
        },
      ],
    },
    {
      nameUrl: "gardening",
      urlImage: "/images/gardening-main.jpg",
      sectionTitle: "Gardening Services",
      sectionSubtitle:
        "Lawn and garden maintenance to keep your outdoor spaces looking their best.",
      subTitle: "Expert Garden Care",
      subText:
        "From regular maintenance to one-off restorations, our team keeps your garden neat, healthy, and attractive all year round.",
      items: [
        {
          id: 1,
          title: "Lawn Mowing",
          description:
            "Regular lawn mowing to keep your grass healthy and tidy.",
          image: "/images/gardening-mowing.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 2,
          title: "Hedge Trimming & Pruning",
          description:
            "Professional trimming and pruning for healthy plant growth.",
          image: "/images/gardening-hedge-trimming.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 3,
          title: "Rubbish Removal",
          description:
            "Green waste and garden rubbish removal for a clean outdoor space.",
          image: "/images/gardening-rubbish-removal.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 4,
          title: "Lawn Dethatching",
          description:
            "Removes thatch buildup for healthier grass and better growth.",
          image: "/images/gardening-dethatching.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 5,
          title: "Ride On Mowing",
          description:
            "Efficient mowing for larger properties and acreage blocks.",
          image: "/images/gardening-ride-on-mowing.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 6,
          title: "Gutter Cleaning",
          description:
            "Gutter clearing and maintenance to prevent water damage.",
          image: "/images/gardening-gutter-cleaning.jpg",
          cta: "Request Quote",
          price: 10,
        },
      ],
    },
    {
      nameUrl: "concreting",
      urlImage: "/images/concreting-main.jpg",
      sectionTitle: "Concreting Services",
      sectionSubtitle:
        "Small concrete jobs for residential and commercial properties.",
      subTitle: "Quality Concrete Work",
      subText:
        "Quality workmanship, reliable service, and durable results that meet your needs and budget.",
      items: [
        {
          id: 1,
          title: "Footpaths",
          description:
            "Concrete footpath installation and repairs for safe walkways.",
          image: "/images/concreting-footpaths.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 2,
          title: "Driveways",
          description: "New driveway installation and concrete resurfacing.",
          image: "/images/concreting-driveways.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 3,
          title: "Slabs",
          description:
            "Concrete slabs for patios, sheds, extensions, and more.",
          image: "/images/concreting-slabs.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 4,
          title: "Concrete Repairs",
          description:
            "Crack repair, resurfacing, and restoration for existing concrete.",
          image: "/images/concreting-repairs.jpg",
          cta: "Request Quote",
          price: 10,
        },
      ],
    },
    {
      nameUrl: "removalist",
      urlImage: "/images/removalist-main.jpg",
      sectionTitle: "Removalist Services",
      sectionSubtitle:
        "Reliable and affordable moving services for homes and businesses.",
      subTitle: "Stress-Free Moving",
      subText:
        "We handle your belongings with care, ensuring a smooth and stress-free moving experience from start to finish.",
      items: [
        {
          id: 1,
          title: "Small Moves",
          description: "Perfect for moving a few items or furniture pieces.",
          image: "/images/removalist-small-moves.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 2,
          title: "Delivery of Purchase Items",
          description: "We deliver your purchased items safely and on time.",
          image: "/images/removalist-delivery.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 3,
          title: "Commercial Moves",
          description:
            "Office and business relocation services with minimal downtime.",
          image: "/images/removalist-commercial-moves.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 4,
          title: "House Moving",
          description:
            "Complete home relocation — we handle everything with care.",
          image: "/images/removalist-house-moving.jpg",
          cta: "Request Quote",
          price: 10,
        },
      ],
    },
  ],
};
