import { useState } from "react";
import { ShoppingCart, Heart, User, Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import CartDrawer from "./cart/CartDrawer";
import { useQuery } from "@tanstack/react-query";
import { Link, NavLink } from "react-router-dom";
import { fetchActiveCategories } from "@/lib/api/categories";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ["active-categories"],
    queryFn: fetchActiveCategories,
  });

  // Fonction pour corriger les URLs de redirection
  const getRedirectUrl = (subSub, allCategories) => {
    if (subSub.redirect_url?.startsWith("/?souscategorie=")) {
      const parent = allCategories.find(c => c.id === subSub.parent_id);
      const grandParent = parent && allCategories.find(c => c.id === parent.parent_id);
      const parentSlug = grandParent ? grandParent.slug : parent?.slug;

      if (parentSlug) {
        // Remplace /? par ? pour le combiner avec le chemin de catégorie
        const queryParams = subSub.redirect_url.substring(1);
        const redirectUrl = `/categories/${parentSlug}${queryParams}`;
        console.log("🔧 URL corrigée :", redirectUrl, "pour", subSub.name);
        return redirectUrl;
      }
    }

    return subSub.redirect_url || `/categories/${subSub.slug}`;
  };

  const infoPages = [
    { title: "À propos de nous", href: "/about" },
    { title: "Suivi colis", href: "/tracking" },
    { title: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* 🔥 Barre d'annonces au-dessus du Header */}
      <div className="w-full bg-red-500 text-white text-center text-sm font-semibold py-1">
        Livraison gratuite à partir de 50€ – -10% sur votre 1ère commande avec le code WELCOME
      </div>
      <div className="h-2" />

      {/* Header principal */}
      <header className="relative bg-white/80 backdrop-blur-md z-40 border-b border-gray-200">
        <div className="container mx-auto px-4">
          {/* 🔧 Header Mobile */}
          <div className="flex items-center justify-between lg:hidden py-4">
            {/* Menu hamburger à gauche */}
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)}>
              <Menu className="h-6 w-6 text-gray-700" />
            </Button>

            {/* Logo centré */}
            <Link to="/" className="flex-grow text-center">
              <span className="text-2xl font-bold text-ocean">AquaShop</span>
            </Link>

            {/* Icônes à droite */}
            <div className="flex items-center space-x-4 pr-1">
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-5 w-5 text-gray-600" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5 text-gray-600" />
              </Button>
              <CartDrawer />
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between gap-2 h-16">
            {/* Logo */}
            <Link to="/" className="text-2xl font-bold text-ocean mr-6">
              AquaShop
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <NavigationMenu>
                <NavigationMenuList>
                  {categories
                    .filter((cat) => !cat.parent_id)
                    .map((category) => {
                      const hasChildren = categories.some((c) => c.parent_id === category.id);

                      return (
                        <NavigationMenuItem key={category.id}>
                          {hasChildren ? (
                            <>
                              <NavigationMenuTrigger>
                                <span className="text-sm font-semibold text-ocean">
                                  {category.name}
                                </span>
                              </NavigationMenuTrigger>
                              {hasChildren && (
                                <NavigationMenuContent className="absolute left-1/2 transform -translate-x-1/2">
                                  {(() => {
                                    const subCategories = categories.filter((sub) => sub.parent_id === category.id);
                                    const validColumns = subCategories.filter((sub) => {
                                      return sub.slug || categories.some((child) => child.parent_id === sub.id);
                                    });

                                    const columnCount = Math.min(validColumns.length, 3); // max 3 colonnes
                                    
                                    const columnWidths = {
                                      1: 'grid-cols-1 justify-center',
                                      2: 'grid-cols-2 justify-center',
                                      3: 'grid-cols-3 justify-between',
                                    };

                                    const columnClass = columnWidths[columnCount] || 'grid-cols-3 justify-between';

                                    return (
                                      <ul
                                        className={`grid ${columnClass} gap-4 p-6 max-h-[800px] overflow-y-auto w-full`}
                                        style={{ minWidth: "600px", maxWidth: "900px" }}
                                      >
                                        {validColumns.map((subCategory) => (
                                          <li key={subCategory.id} className="mb-6">
                                            {subCategory.slug ? (
                                              <NavigationMenuLink asChild>
                                                <NavLink
                                                  to={`/categories/${subCategory.slug}`}
                                                  className="block font-medium text-base text-gray-900 hover:underline mb-2"
                                                >
                                                  {subCategory.name}
                                                </NavLink>
                                              </NavigationMenuLink>
                                            ) : (
                                              <span className="block font-medium text-base text-gray-900 mb-2">
                                                {subCategory.name}
                                              </span>
                                            )}

                                            <ul className="space-y-2">
                                              {categories
                                                .filter((subSub) => subSub.parent_id === subCategory.id)
                                                .map((subSub) =>
                                                  subSub.slug ? (
                                                    <li key={subSub.id}>
                                                      <NavigationMenuLink asChild>
                                                        <NavLink
                                                          to={getRedirectUrl(subSub, categories)}
                                                          className="block select-none rounded-md py-2 px-3 text-sm text-gray-600 hover:bg-accent hover:text-accent-foreground"
                                                        >
                                                          {subSub.name}
                                                        </NavLink>
                                                      </NavigationMenuLink>
                                                    </li>
                                                  ) : (
                                                    <li key={subSub.id}>
                                                      <span className="block select-none rounded-md py-2 px-3 text-sm text-gray-600">
                                                        {subSub.name}
                                                      </span>
                                                    </li>
                                                  )
                                                )}
                                            </ul>
                                          </li>
                                        ))}
                                      </ul>
                                    );
                                  })()}
                                </NavigationMenuContent>
                              )}
                            </>
                          ) : (
                            <NavigationMenuLink asChild>
                              <NavLink
                                to={`/categories/${category.slug}`}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold text-ocean h-10 px-4 py-2 bg-background hover:bg-accent hover:text-accent-foreground"
                              >
                                {category.name}
                              </NavLink>
                            </NavigationMenuLink>
                          )}
                        </NavigationMenuItem>
                      );
                    })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Desktop Search and Icons */}
            <div className="hidden lg:flex items-center space-x-4 ml-6">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:border-ocean"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
              <CartDrawer />
            </div>
          </div>

          {/* Menu Mobile */}
          <div
            className={`
              fixed top-0 left-0 w-full max-h-screen z-50 overflow-y-auto overscroll-contain transition-transform duration-300
              ${isMenuOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'}
            `}
            style={{ background: 'linear-gradient(to bottom, #e6f2f8, #ffffff)' }}
          >
            {/* Barre supérieure avec logo + bouton de fermeture */}
            <div className="sticky top-0 left-0 right-0 flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b">
              <Link to="/" className="text-xl font-bold text-ocean">
                AquaShop
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="h-6 w-6 text-gray-600" />
              </Button>
            </div>

            {/* 🧭 Arborescence responsive */}
            <nav className="flex flex-col gap-4 text-sm px-6 py-6">
              {categories
                .filter((cat) => !cat.parent_id)
                .map((category) => (
                  <div key={category.id}>
                    <NavLink
                      to={`/categories/${category.slug}`}
                      className="block font-semibold text-lg text-ocean mb-1"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {category.name}
                    </NavLink>

                    {/* Sous-catégories */}
                    <div className="ml-4 mb-2">
                      {categories
                        .filter((sub) => sub.parent_id === category.id)
                        .map((sub) => (
                          <div key={sub.id}>
                            <NavLink
                              to={`/categories/${sub.slug}`}
                              className="block text-gray-700 mb-1 hover:text-ocean"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              {sub.name}
                            </NavLink>

                            {/* Sous-sous-catégories */}
                            <div className="ml-4 mb-1">
                              {categories
                                .filter((subSub) => subSub.parent_id === sub.id)
                                .map((subSub) => (
                                  <NavLink
                                    key={subSub.id}
                                    to={getRedirectUrl(subSub, categories)}
                                    className="block text-gray-500 hover:text-ocean mb-0.5"
                                    onClick={() => setIsMenuOpen(false)}
                                  >
                                    {subSub.name}
                                  </NavLink>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

              {/* 🔗 Liens de navigation classiques */}
              <div className="mt-6 border-t pt-4">
                {infoPages.map((page) => (
                  <NavLink
                    key={page.title}
                    to={page.href}
                    className="block text-gray-500 hover:text-ocean"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {page.title}
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>

          {/* SearchDrawer */}
          {isSearchOpen && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setIsSearchOpen(false)}
              />

              {/* Drawer */}
              <div className="fixed top-0 left-0 w-full h-screen bg-white z-50 p-4 overflow-y-auto animate-slide-in flex flex-col">
                {/* Barre du haut */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold text-ocean">Recherche</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)}>
                    <X className="h-6 w-6 text-gray-600" />
                  </Button>
                </div>

                {/* Champ de recherche */}
                <input
                  type="text"
                  placeholder="Rechercher un produit, une catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring focus:border-ocean"
                  autoFocus
                />
              </div>
            </>
          )}

          {/* Overlay du menu mobile */}
          <div
            className={`
              fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300
              ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `}
            onClick={() => setIsMenuOpen(false)}
          />
        </div>
      </header>
    </>
  );
};

export default Header;
