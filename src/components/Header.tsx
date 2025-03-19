import { useState } from "react";
import { ShoppingCart, Heart, User, Search, Menu } from "lucide-react";
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

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainCategories = [
    {
      title: "Décorations",
      href: "/collections/decorations",
    },
    {
      title: "Pompes",
      href: "/collections/pompes",
      subcategories: [
        { title: "Pompes à air", href: "/collections/pompes-air" },
        { title: "Pompes à eau", href: "/collections/pompes-eau" },
        { title: "Filtres & circulation", href: "/collections/filtres-circulation" },
      ],
    },
    {
      title: "Chauffages et Ventilation",
      href: "/collections/chauffages-ventilation",
    },
    {
      title: "Bio-Chimique",
      href: "/collections/bio-chimique",
      subcategories: [
        { title: "Traitement de l'eau", href: "/collections/traitement-eau" },
        { title: "Stabilisateurs de pH", href: "/collections/stabilisateurs-ph" },
        { title: "Produits anti-algues", href: "/collections/anti-algues" },
      ],
    },
    {
      title: "Éclairages",
      href: "/collections/eclairages",
    },
    {
      title: "Entretiens et Nettoyages",
      href: "/collections/entretiens-nettoyages",
      subcategories: [
        { title: "Nettoyants pour aquarium", href: "/collections/nettoyants-aquarium" },
        { title: "Aspirateurs de gravier", href: "/collections/aspirateurs-gravier" },
        { title: "Outils de maintenance", href: "/collections/outils-maintenance" },
      ],
    },
    {
      title: "Alimentation",
      href: "/collections/alimentation",
    },
  ];

  const infoPages = [
    { title: "À propos de nous", href: "/about" },
    { title: "Suivi colis", href: "/tracking" },
    { title: "Contact", href: "/contact" },
  ];

  return (
    <header className="fixed top-[40px] left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="/" className="text-2xl font-bold text-ocean">
            AquaShop
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            <NavigationMenu>
              <NavigationMenuList>
                {mainCategories.map((category) => (
                  <NavigationMenuItem key={category.title}>
                    {category.subcategories ? (
                      <>
                        <NavigationMenuTrigger>{category.title}</NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <ul className="grid w-[400px] gap-3 p-4">
                            {category.subcategories.map((subcategory) => (
                              <li key={subcategory.title}>
                                <NavigationMenuLink asChild>
                                  <a
                                    href={subcategory.href}
                                    className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                  >
                                    {subcategory.title}
                                  </a>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </NavigationMenuContent>
                      </>
                    ) : (
                      <NavigationMenuLink asChild>
                        <a
                          href={category.href}
                          className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                        >
                          {category.title}
                        </a>
                      </NavigationMenuLink>
                    )}
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Search and Icons */}
          <div className="hidden lg:flex items-center space-x-6">
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

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 space-y-4">
            {mainCategories.map((category) => (
              <div key={category.title} className="space-y-2">
                <a
                  href={category.href}
                  className="block px-4 py-2 text-text hover:bg-surface-light rounded-md font-medium"
                >
                  {category.title}
                </a>
                {category.subcategories && (
                  <div className="pl-8 space-y-2">
                    {category.subcategories.map((subcategory) => (
                      <a
                        key={subcategory.title}
                        href={subcategory.href}
                        className="block px-4 py-2 text-text hover:bg-surface-light rounded-md"
                      >
                        {subcategory.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {infoPages.map((page) => (
              <a
                key={page.title}
                href={page.href}
                className="block px-4 py-2 text-text hover:bg-surface-light rounded-md"
              >
                {page.title}
              </a>
            ))}
            <div className="flex items-center space-x-4 px-4 pt-4 border-t">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
              <CartDrawer />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
