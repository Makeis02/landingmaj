import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/autoplay';
import { EditableText } from "@/components/EditableText";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEditStore } from "@/stores/useEditStore";

interface UpcomingItem {
  id: string;
  name: string;
  image: string;
  description?: string;
}

const Upcoming = () => {
  const { isEditMode } = useEditStore();

  const { data: contentData, refetch: refetchContent } = useQuery({
    queryKey: ["upcoming-content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .like("content_key", "upcoming%");
      return data?.reduce((acc, item) => {
        acc[item.content_key] = item.content;
        return acc;
      }, {} as Record<string, string>) || {};
    },
  });

  const { data: imagesData, refetch: refetchImages } = useQuery({
    queryKey: ["upcoming-images"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_content_images")
        .select("key_name, image_url")
        .like("key_name", "upcoming_card_image_%");
      return data?.reduce((acc, item) => {
        acc[item.key_name] = item.image_url;
        return acc;
      }, {} as Record<string, string>) || {};
    },
  });

  const handleTextUpdate = async (newText: string, contentKey: string) => {
    await supabase
      .from("editable_content")
      .upsert({ content_key: contentKey, content: newText });
  };

  const handleUpcomingImageUpload = async (file: File | undefined, keyName: string) => {
    if (!file) return;
    try {
      // Upload l'image
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-images')
        .upload(`upcoming/${Date.now()}-${file.name}`, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        console.error("Erreur d'upload:", uploadError);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('public-images')
        .getPublicUrl(uploadData?.path);

      if (!publicUrl) {
        console.error("Erreur de génération de l'URL publique");
        return;
      }

      // Met à jour la base de données
      await supabase
        .from('site_content_images')
        .upsert({
          key_name: keyName,
          image_url: publicUrl,
          created_at: new Date().toISOString()
        });

      // Refetch les données
      await refetchImages();
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
    }
  };

  const upcomingItems = [
    {
      id: "0",
      name: contentData?.upcoming_card_title_0 || "Nourriture spéciale Discus",
      image: imagesData?.["upcoming_card_image_0"] || "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      description: contentData?.upcoming_card_description_0 || ""
    },
    {
      id: "1",
      name: contentData?.upcoming_card_title_1 || "Traitement naturel d'eau",
      image: imagesData?.["upcoming_card_image_1"] || "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      description: contentData?.upcoming_card_description_1 || ""
    },
    {
      id: "2",
      name: contentData?.upcoming_card_title_2 || "Éclairage Nano LED",
      image: imagesData?.["upcoming_card_image_2"] || "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      description: contentData?.upcoming_card_description_2 || ""
    },
    {
      id: "3",
      name: contentData?.upcoming_card_title_3 || "Accessoire aquascaping",
      image: imagesData?.["upcoming_card_image_3"] || "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      description: contentData?.upcoming_card_description_3 || ""
    },
    {
      id: "4",
      name: contentData?.upcoming_card_title_4 || "Plante Anubias mini",
      image: imagesData?.["upcoming_card_image_4"] || "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      description: contentData?.upcoming_card_description_4 || ""
    }
  ];

  return (
    <section className="py-20 bg-[#F9FAFB]">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            <EditableText
              contentKey="upcoming_title"
              initialContent="Prochainement dans vos box"
              onUpdate={(text) => handleTextUpdate(text, "upcoming_title")}
            />
          </h2>
          <p className="text-xl text-slate-600">
            <EditableText
              contentKey="upcoming_subtitle"
              initialContent="Un avant-goût des surprises exclusives qui arrivent !"
              onUpdate={(text) => handleTextUpdate(text, "upcoming_subtitle")}
            />
          </p>
        </div>

        <Swiper
          modules={[EffectCoverflow, Autoplay]}
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={3}
          loop={true}
          speed={800}
          coverflowEffect={{
            rotate: 35,
            stretch: 0,
            depth: 150,
            modifier: 1.5,
            slideShadows: false
          }}
          autoplay={{ 
            delay: 4000,
            disableOnInteraction: false
          }}
          className="!pb-12 !pt-8"
          breakpoints={{
            320: {
              slidesPerView: 1,
              spaceBetween: 30
            },
            640: {
              slidesPerView: 2,
              spaceBetween: 30
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 30
            }
          }}
        >
          {upcomingItems.map((item) => (
            <SwiperSlide key={item.id}>
              <div className="shadow-[0_10px_20px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden">
                <div className="bg-white p-6 transform transition-all duration-300 h-full flex flex-col items-center justify-center">
                  <div className="w-32 h-32 mb-6 rounded-full overflow-hidden bg-gray-100 relative">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://via.placeholder.com/128?text=Image";
                      }}
                    />
                    {isEditMode && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUpcomingImageUpload(e.target.files?.[0], `upcoming_card_image_${item.id}`)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                      />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 text-center mb-2">
                    <EditableText
                      contentKey={`upcoming_card_title_${item.id}`}
                      initialContent={item.name}
                      onUpdate={(text) => handleTextUpdate(text, `upcoming_card_title_${item.id}`)}
                    />
                  </h3>
                  {item.description && (
                    <p className="text-sm text-slate-500 text-center">
                      <EditableText
                        contentKey={`upcoming_card_description_${item.id}`}
                        initialContent={item.description}
                        onUpdate={(text) => handleTextUpdate(text, `upcoming_card_description_${item.id}`)}
                      />
                    </p>
                  )}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default Upcoming;