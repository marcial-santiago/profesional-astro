export type ServiceAll = {
  services: {
    urlImage: string;
    nameUrl: string;
    sectionTitle: string;
    sectionSubtitle: string;

    subTitle: string;
    subText: string;
    items: {
      id: number;
      title: string;
      description: string;
      image: string;
      cta: string;
    }[];
  }[];
};
