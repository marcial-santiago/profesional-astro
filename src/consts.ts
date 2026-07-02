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
      urlImage:
        "https://media.istockphoto.com/id/1417833187/photo/professional-cleaner-vacuuming-a-carpet.jpg?s=612x612&w=0&k=20&c=5h8NBR190d46Ni4MclqJ7Zf9ZOtf3TM3gPRJaHUdMjk=",
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
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUyrd4vM9MZuEr540eyhXr4_fIp3pFYyrbFEr9gJ7dCklDBqlJiq5RUOA&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 2,
          title: "Office Cleaning",
          description: "Keep your workspace clean and productive.",
          image:
            "https://media.istockphoto.com/id/2209016975/photo/young-man-in-uniform-vacuum-cleaning-the-floor-in-the-conference-room.jpg?s=612x612&w=0&k=20&c=ZMZxYxC4wiWGKkg4AFgzKmHQfpc5MU9XcCEogJYwBaQ=",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 3,
          title: "After Builders Cleaning",
          description: "Post-construction debris and dust removal.",
          image:
            "https://tidyspaces.uk/assets/img/after-builders-cleaning-bedford.webp",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 4,
          title: "End of Lease Cleaning",
          description:
            "Get your bond back with our thorough end-of-lease service.",
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-tnJGsW4ucl1oYPrQ5gBXWVe45zOnWOTEonC9QiaYKRaOLaaNPq9vb0Y&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 5,
          title: "Oven Cleaning",
          description:
            "Deep oven cleaning to remove built-up grease and grime.",
          image:
            "https://cdn.shopify.com/s/files/1/0550/2160/0922/files/Picture_2_c23b7803-0e89-4316-9258-db7d0ec31142_480x480.jpg?v=1731420915",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 6,
          title: "BBQ Cleaning",
          description:
            "Professional BBQ cleaning to keep it looking and cooking like new.",
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6nlh2jB4z2fKMCZqS3ffbC-BD3-ZHA906b1alKqiSRXPIwSJ7_Gr_t-Wl&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 7,
          title: "Pressure Wash Cleaning",
          description:
            "High-pressure cleaning for driveways, patios, and exterior walls.",
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFpdtBuE8yGzhwSuSzv6W8ffai9RQVyZnMSrHAnbc5Ze8X5XHtaqQHU04&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 8,
          title: "Upholstery & Carpet Cleaning",
          description: "Steam cleaning for upholstery, carpets, and rugs.",
          image:
            "https://www.rbcclean.com/wp-content/uploads/2020/08/Carpet-Cleaning-Service.jpg",
          cta: "Request Quote",
          price: 10,
        },
      ],
    },
    {
      nameUrl: "gardening",
      urlImage:
        "https://storage.googleapis.com/proimagesingapur/offered-service/120-mantenimiento-cuidado-jardin-puntual/hogami-mantenimiento-y-cuidado-jardin-430x282-01.webp",
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
          image:
            "https://lil.sfo2.cdn.digitaloceanspaces.com/public/Uploads/lawn-mowing-backyard.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 2,
          title: "Hedge Trimming & Pruning",
          description:
            "Professional trimming and pruning for healthy plant growth.",
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQltAMQWDlBMGivXztUZZZeDx7oZAzZqGJJuAvn0S3HGA&s",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 3,
          title: "Rubbish Removal",
          description:
            "Green waste and garden rubbish removal for a clean outdoor space.",
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEd9tMb4cj82vqAsP9g7PVC3V93q8Ex-W1CpEhQWB93H4-yl-ovvpdL6RL&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 4,
          title: "Lawn Dethatching",
          description:
            "Removes thatch buildup for healthier grass and better growth.",
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWGBNjq6G_L6AVs6W40tFmFlMBp9JGnISXJGlKjGPgRLChChXiDtnli4SN&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 5,
          title: "Ride On Mowing",
          description:
            "Efficient mowing for larger properties and acreage blocks.",
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRb1FzcGehdvaHaeItYcFAM5Je16cbPXcIiTazp9JZUnpKfM6m1Cms2IMA&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 6,
          title: "Gutter Cleaning",
          description:
            "Gutter clearing and maintenance to prevent water damage.",
          image:
            "https://production-next-images-cdn.thumbtack.com/i/464201071280816135/width/1024",
          cta: "Request Quote",
          price: 10,
        },
      ],
    },
    {
      nameUrl: "concreting",
      urlImage:
        "https://media.istockphoto.com/id/1657566602/photo/two-construction-workers-working-together-on-an-apartment-renovation.jpg?s=612x612&w=0&k=20&c=9U8I8t_7rljrVhCCQHACecXooE0_iJ7bTvlXp7WDNXs=",
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
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlwZZCsglNKS-PC-XP9UlbEW1Bz_2spIzsa2PGbiAgtC1DEN3Ih_no_Lo&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 2,
          title: "Driveways",
          description: "New driveway installation and concrete resurfacing.",
          image:
            "https://www.selandscapeconstruction.co.uk/wp-content/uploads/2020/03/Driveways-Essex-3.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 3,
          title: "Slabs",
          description:
            "Concrete slabs for patios, sheds, extensions, and more.",
          image:
            "https://stanstedpaving.co.uk/wp-content/uploads/2023/08/Riven_Slate-Natural_CMVJ7836.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 4,
          title: "Concrete Repairs",
          description:
            "Crack repair, resurfacing, and restoration for existing concrete.",
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSLmV8PaO9jNLSo1_vE1PG71V_OQc8xC-s14TCcYhWeyA&s=10",
          cta: "Request Quote",
          price: 10,
        },
      ],
    },
    {
      nameUrl: "removalist",
      urlImage:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQt9XpK228ctywmnHSRPfGObYM519I7RXhYm74eeS3btQ&s=10",
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
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTx30yIZL4BmYvyvW-j15PgEmPiz3aVOa0J-2wJa95DNNaEAIKiIWs2_ek&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 2,
          title: "Delivery of Purchase Items",
          description: "We deliver your purchased items safely and on time.",
          image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ1zL8eGiLSh0BsGlUiS7xyxJKFx8YeYug3AFguOVy-4nV7HnqJhIDIEgc&s=10",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 3,
          title: "Commercial Moves",
          description:
            "Office and business relocation services with minimal downtime.",
          image:
            "https://www.amazingmoves.com/media/k2/items/cache/d382bd8ae87d9139df6458192532657c_XL.jpg",
          cta: "Request Quote",
          price: 10,
        },
        {
          id: 4,
          title: "House Moving",
          description:
            "Complete home relocation — we handle everything with care.",
          image:
            "https://hips.hearstapps.com/hmg-prod/images/moving-house-checklist-66ba20c12a5fa.jpg?crop=0.889xw:1.00xh;0.0561xw,0&resize=768:*",
          cta: "Request Quote",
          price: 10,
        },
      ],
    },
  ],
};
