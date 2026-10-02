const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getCategoryFallback(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('plot') || cat.includes('land') || cat.includes('site') || cat.includes('layout')) {
    return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
  }
  if (cat.includes('villa') || cat.includes('estate') || cat.includes('house') || cat.includes('independent') || cat.includes('bungalow')) {
    return 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80';
  }
  if (cat.includes('apartment') || cat.includes('flat') || cat.includes('residential') || cat.includes('penthouse')) {
    return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
  }
  if (cat.includes('commercial') || cat.includes('office') || cat.includes('retail') || cat.includes('shop')) {
    return 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80';
  }
  if (cat.includes('farm') || cat.includes('agri')) {
    return 'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
}

async function run() {
  const images = await prisma.propertyImage.findMany({ include: { property: true } });
  let count = 0;
  for (const img of images) {
    if (!img.imageUrl || img.imageUrl.length < 500 || img.imageUrl.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')) {
      const fallback = getCategoryFallback(img.property ? img.property.category : '');
      await prisma.propertyImage.update({
        where: { id: img.id },
        data: { imageUrl: fallback }
      });
      count++;
    }
  }
  console.log(`Successfully replaced ${count} dummy/blank property images with high-res category photos.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
