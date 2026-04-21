export const generateSlug = (name: string): string => {
   return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
};

export const generateUniqueSlug = (name: string): string => {
   const baseSlug = generateSlug(name);
   const randomSuffix = Math.random().toString(36).substring(2, 6);
   return baseSlug ? `${baseSlug}-${randomSuffix}` : `athlete-${randomSuffix}`;
};
