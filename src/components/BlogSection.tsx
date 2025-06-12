import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EditableText } from "./EditableText";
import { EditableURL } from "./EditableURL";
import { Link } from "react-router-dom";
import { useEditStore } from "@/stores/useEditStore";
import { EditableImage } from "./EditableImage";
import { toast } from "@/components/ui/use-toast";

const BlogSection = () => {
  const { isEditMode } = useEditStore();
  const queryClient = useQueryClient();

  const { data: articles, error } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  const { data: content } = useQuery({
    queryKey: ["blog-content", articles?.map(a => a.id)],
    enabled: !!articles?.length,
    queryFn: async () => {
      const keys = [
        "blog_cta_url",
        "blog_see_more_url",
        ...(articles?.map(a => `blog_${a.id}_image_url`) || [])
      ];

      const { data, error } = await supabase
        .from("editable_content")
        .select("*")
        .in("content_key", keys);

      if (error) throw error;

      const result: Record<string, string> = {};
      data?.forEach((item) => {
        result[item.content_key] = item.content;
      });

      return {
        ctaUrl: result.blog_cta_url || "/blog",
        seeMoreUrl: result.blog_see_more_url || "/blog",
        images: result,
      };
    },
  });

  const updateArticleImageMutation = useMutation({
    mutationFn: async ({ articleId, imageUrl }: { articleId: string; imageUrl: string }) => {
      const updates = [
        supabase
          .from("blog_posts")
          .update({ image_url: imageUrl })
          .eq("id", articleId),
        
        supabase
          .from("editable_content")
          .upsert({
            content_key: `blog_${articleId}_image_url`,
            content: imageUrl,
          }, { onConflict: "content_key" })
      ];

      const [blogPostResult, contentResult] = await Promise.all(updates);

      if (blogPostResult.error || contentResult.error) {
        throw blogPostResult.error || contentResult.error;
      }

      return blogPostResult.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-content"] });
      toast({
        title: "Image de l'article mise à jour",
        description: "L'image a été sauvegardée avec succès.",
      });
    },
    onError: (err) => {
      toast({
        title: "Erreur lors de la mise à jour de l'image",
        description: err.message || "Impossible de mettre à jour l'image de l'article.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <section className="py-20 bg-surface-light">
        <div className="container">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Erreur de chargement</h2>
            <p className="text-gray-600">Une erreur est survenue lors du chargement des articles.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-surface-light">
      <div className="container">
        <div className="text-center mb-8">
          <EditableText
            contentKey="blog_section_title"
            initialContent="Nos Conseils & Guides"
            className="text-3xl font-bold mb-4"
          />
          <EditableText
            contentKey="blog_section_subtitle"
            initialContent="Découvrez nos articles d'experts pour prendre soin de votre aquarium et de vos poissons"
            className="text-gray-600 max-w-2xl mx-auto"
          />
        </div>
        
        {articles && articles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {articles.map((article) => (
                <Card
                  key={article.id}
                  className="overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
                >
                  <div className="relative h-56">
                    {article.tag && (
                      <span className="absolute top-4 left-4 bg-ocean text-white px-3 py-1 rounded-full text-sm font-medium z-10">
                        {article.tag}
                      </span>
                    )}
                    <EditableImage
                      imageKey={`blog_${article.id}`}
                      initialUrl={
                        content?.images?.[`blog_${article.id}_image_url`] ??
                        article.image_url ??
                        "https://images.unsplash.com/photo-1584267651117-32aacc26307b"
                      }
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      onUpdate={(newUrl) => {
                        updateArticleImageMutation.mutate({ articleId: article.id, imageUrl: newUrl });
                      }}
                    />
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="mb-2 text-sm text-gray-500">
                      {article.published_at && (
                        format(new Date(article.published_at), "d MMMM yyyy", { locale: fr })
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 text-gray-900">{article.title}</h3>
                    {article.excerpt && (
                      <p className="text-gray-600 mb-6 flex-1 line-clamp-3">{article.excerpt}</p>
                    )}
                    {!isEditMode && (
                      <div className="relative">
                        <Link 
                          to={content?.ctaUrl || "/blog"}
                          className="w-full mt-auto"
                        >
                          <Button 
                            variant="outline" 
                            className="w-full hover:bg-ocean hover:text-white transition-colors"
                          >
                            <EditableText
                              contentKey="blog_cta"
                              initialContent="Lire l'article"
                              className="hover:text-white"
                            />
                          </Button>
                        </Link>
                        <EditableURL
                          contentKey="blog_cta_url"
                          initialContent="/blog"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {!isEditMode && (
              <div className="text-center relative">
                <Link 
                  to={content?.seeMoreUrl || "/blog"}
                >
                  <Button 
                    variant="outline"
                    className="hover:bg-ocean hover:text-white transition-colors px-8"
                  >
                    <EditableText
                      contentKey="blog_see_more"
                      initialContent="Plus d'articles"
                      className="hover:text-white"
                    />
                  </Button>
                </Link>
                <EditableURL
                  contentKey="blog_see_more_url"
                  initialContent="/blog"
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Aucun article n'est disponible pour le moment.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
