import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import heroMedical1 from "@/assets/hero-medical-1.jpg";
import heroMedical2 from "@/assets/hero-medical-2.jpg";
import heroMedical3 from "@/assets/hero-medical-3.jpg";

const images = [
  { src: heroMedical1, labelKey: "service.home_nursing" },
  { src: heroMedical2, labelKey: "service.general_medicine" },
  { src: heroMedical3, labelKey: "service.home_physiotherapy" },
];

const ImageGallery = () => {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="py-20">
      <div className="container max-w-6xl space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3"
        >
          <h2 className="text-2xl sm:text-3xl font-black text-foreground">
            {t("landing.gallery_title")}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("landing.gallery_sub")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {images.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative group cursor-pointer overflow-hidden rounded-2xl aspect-square"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <motion.img
                src={img.src}
                alt={t(img.labelKey)}
                className="w-full h-full object-cover"
                animate={{
                  scale: hovered === i ? 1.08 : 1,
                }}
                transition={{ duration: 0.4 }}
                loading="lazy"
              />

              {/* Overlay */}
              <AnimatePresence>
                {hovered === i && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent flex items-end p-5"
                  >
                    <motion.p
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 15, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-white font-bold text-lg"
                    >
                      {t(img.labelKey)}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Always-visible label on mobile */}
              <div className="sm:hidden absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-white font-semibold text-sm">{t(img.labelKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImageGallery;
