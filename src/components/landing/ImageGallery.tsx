import { useLanguage } from "@/contexts/LanguageContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useM3ScrollReveal } from "@/hooks/useM3ScrollReveal";
import heroMedical1 from "@/assets/hero-medical-1.jpg";
import heroMedical2 from "@/assets/hero-medical-2.jpg";
import heroMedical3 from "@/assets/hero-medical-3.jpg";

const images = [
  { src: heroMedical1, labelKey: "service.home_nursing" },
  { src: heroMedical2, labelKey: "service.general_medicine" },
  { src: heroMedical3, labelKey: "service.home_physiotherapy" },
];

/**
 * M3 Carousel — Hero/Multi-browse style.
 * Uses shadcn Carousel (embla) with Material 3 styling (rounded-3xl, elevation-2).
 */
const ImageGallery = () => {
  const { t } = useLanguage();
  const ref = useM3ScrollReveal<HTMLDivElement>();

  return (
    <section ref={ref} className="py-12 sm:py-20">
      <div className="container max-w-6xl px-4 sm:px-6 space-y-8 sm:space-y-10">
        <div className="text-center space-y-3 m3-reveal">
          <h2 className="m3-headline-md text-foreground">{t("landing.gallery_title")}</h2>
          <p className="m3-body-lg text-muted-foreground max-w-xl mx-auto">
            {t("landing.gallery_sub")}
          </p>
        </div>

        <div className="m3-reveal">
          <Carousel
            opts={{ align: "start", loop: true }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 sm:-ml-4">
              {images.map((img, i) => (
                <CarouselItem
                  key={i}
                  className="pl-3 sm:pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3"
                >
                  <figure className="group relative overflow-hidden rounded-3xl aspect-square m3-elevation-2 hover:m3-elevation-4 transition-shadow [transition-duration:var(--m3-duration-medium2)] [transition-timing-function:var(--m3-easing-emphasized)]">
                    <img
                      src={img.src}
                      alt={t(img.labelKey)}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-[var(--m3-easing-emphasized)] group-hover:scale-105"
                    />
                    {/* M3 scrim + caption */}
                    <figcaption className="absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-black/75 via-black/35 to-transparent text-white">
                      <span className="m3-label-lg uppercase tracking-wider opacity-90">
                        {t(img.labelKey)}
                      </span>
                    </figcaption>
                  </figure>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-4 m3-elevation-2" />
            <CarouselNext className="hidden sm:flex -right-4 m3-elevation-2" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default ImageGallery;
