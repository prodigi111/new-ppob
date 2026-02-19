import React from 'react';
import { Link } from 'react-router-dom';
import { imgUrl } from '../lib/utils';

export const GameCard = ({ product }) => {
  const linkTo = product.source === 'digiflazz'
    ? `/product/${product.slug}`
    : `/product/${product.slug}`;

  return (
    <Link
      to={linkTo}
      className="game-card group relative overflow-hidden bg-card border border-white/5 hover:border-primary/50 rounded-xl"
      data-testid={`game-card-${product.slug}`}
    >
      {/* Image */}
      <div className="product-image relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-rajdhani font-semibold text-white text-sm md:text-base truncate group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {product.source === 'digiflazz' ? (
          <p className="text-xs text-primary mt-0.5">
            {product.itemCount} item · Mulai Rp {product.startPrice?.toLocaleString('id-ID')}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground capitalize mt-0.5">
            {product.category}
          </p>
        )}
      </div>

      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />
      </div>
    </Link>
  );
};

export const GameCardSkeleton = () => {
  return (
    <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
      </div>
    </div>
  );
};
