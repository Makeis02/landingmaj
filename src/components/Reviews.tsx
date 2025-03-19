
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EditableText } from "./EditableText";

const Reviews = () => {
  const { data: reviews } = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="py-16 bg-gradient-to-b from-ocean/5 to-surface-light">
      <div className="container">
        <div className="text-center mb-12">
          <EditableText
            contentKey="reviews_title"
            initialContent="Nos clients en parlent"
            className="text-3xl font-bold mb-4"
          />
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 fill-ocean text-ocean" />
            ))}
          </div>
          <EditableText
            contentKey="reviews_subtitle"
            initialContent="Avis vérifiés ⭐⭐⭐⭐⭐"
            className="text-ocean font-semibold"
          />
        </div>

        <Carousel className="w-full max-w-4xl mx-auto">
          <CarouselContent>
            {reviews?.map((review) => (
              <CarouselItem key={review.id} className="md:basis-1/2 lg:basis-1/3">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-ocean text-ocean" />
                      ))}
                    </div>
                    <p className="text-sm mb-4 italic">"{review.comment}"</p>
                    <p className="font-semibold">{review.customer_name}</p>
                    {review.verified && (
                      <span className="text-xs text-green-600">✓ Achat vérifié</span>
                    )}
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
};

export default Reviews;
