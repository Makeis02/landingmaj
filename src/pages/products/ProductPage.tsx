import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/products/descriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [slug] }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data || !data.descriptions[slug]) {
          setError('Produit introuvable.');
          return;
        }
        setProduct({
          id: slug,
          description: data.descriptions[slug],
        });
      })
      .catch(err => setError('Erreur lors du chargement.'));
  }, [slug]);

  if (error) return <div>❌ {error}</div>;
  if (!product) return <div>⏳ Chargement du produit...</div>;

  return (
    <div>
      <h1>Produit : {slug}</h1>
      <p>Description : {product.description}</p>
    </div>
  );
} 