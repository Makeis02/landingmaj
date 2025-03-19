import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { EditableText } from "@/components/EditableText";
import StarRating from "@/components/ui/StarRating";

console.log("✅ Component Testimonials est chargé");

const initialTestimonials = [
  {
    name: "Jean P.",
    role: "Aquariophile débutant",
    content: "Super pratique, mon aquarium est nickel chaque mois !",
    rating: 5,
  },
  {
    name: "Marie L.",
    role: "Passionnée d'aquariophilie",
    content: "La qualité des produits est exceptionnelle. Je recommande !",
    rating: 5,
  },
  {
    name: "Thomas R.",
    role: "Client depuis 6 mois",
    content: "Plus besoin de me prendre la tête avec les courses, tout arrive à temps.",
    rating: 5,
  },
  {
    name: "Sophie M.",
    role: "Aquariophile experte",
    content: "Les produits sont parfaitement dosés et adaptés à mes besoins.",
    rating: 5,
  },
  {
    name: "Pierre D.",
    role: "Client fidèle",
    content: "Le service client est très réactif et les livraisons sont toujours à l'heure.",
    rating: 5,
  },
  {
    name: "Lucie B.",
    role: "Nouvelle cliente",
    content: "Exactement ce qu'il me fallait pour débuter sereinement dans l'aquariophilie !",
    rating: 5,
  },
];

console.log("✅ Testimonials data:", initialTestimonials);

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState(() => {
    const saved = localStorage.getItem("testimonials");
    return saved ? JSON.parse(saved) : initialTestimonials;
  });

  // Add a refetch function for the component
  const { refetch } = useQuery({
    queryKey: ['testimonials-content'],
    queryFn: async () => {
      // This is a placeholder, adjust as needed based on your actual data fetching needs
      return testimonials;
    },
    enabled: false, // Only fetch when explicitly called
  });

  useEffect(() => {
    console.log("🔄 Testimonials component monté !");
  }, []);

  const updateRating = async (index: number, newRating: number) => {
    setTestimonials((prev) =>
      prev.map((t, i) => (i === index ? { ...t, rating: newRating } : t))
    );

    localStorage.setItem("testimonials", JSON.stringify(testimonials));
  };

  useEffect(() => {
    localStorage.setItem("testimonials", JSON.stringify(testimonials));
  }, [testimonials]);

  return (
    <section className="py-8 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            <EditableText 
              contentKey="testimonials_title"
              initialContent="Ils nous font confiance"
              onUpdate={() => refetch()}
            />
          </h2>
          <p className="text-xl text-slate-600">
            <EditableText 
              contentKey="testimonials_subtitle"
              initialContent="Découvrez ce que nos clients pensent de nos packs"
              onUpdate={() => refetch()}
            />
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {testimonials.map((testimonial, index) => {
              console.log(`📝 Rendu du témoignage ${index + 1}:`, testimonial);
              return (
                <CarouselItem key={testimonial.name} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="testimonial-card bg-white p-5 rounded-lg shadow-sm border border-gray-100 h-full">
                    <StarRating 
                      rating={testimonial.rating} 
                      onChange={(newRating) => updateRating(index, newRating)}
                    />
                    <p className="text-slate-600 mb-4">
                      <EditableText 
                        contentKey={`testimonial_content_${index}`}
                        initialContent={testimonial.content}
                        onUpdate={() => refetch()}
                      />
                    </p>
                    <div>
                      <div className="font-semibold">
                        <EditableText 
                          contentKey={`testimonial_name_${index}`}
                          initialContent={testimonial.name}
                          onUpdate={() => refetch()}
                        />
                      </div>
                      <div className="text-sm text-slate-500">
                        <EditableText 
                          contentKey={`testimonial_role_${index}`}
                          initialContent={testimonial.role}
                          onUpdate={() => refetch()}
                        />
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12 border-primary hover:bg-primary hover:text-white" />
          <CarouselNext className="hidden md:flex -right-12 border-primary hover:bg-primary hover:text-white" />
        </Carousel>
      </div>
    </section>
  );
};

export default Testimonials;
