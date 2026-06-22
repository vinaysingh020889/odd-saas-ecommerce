import { saveProductAction } from "@/lib/admin-actions";

type CategoryOption = {
  id: string;
  name: string;
  type: string;
};

type ProductFormProps = {
  product?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    categoryId: string | null;
    type: string;
    status: string;
    basePrice: unknown;
    mrp: unknown;
    currency: string;
    imageUrl: string | null;
    featured: boolean;
    sortOrder: number;
  };
  categories: CategoryOption[];
  serviceMode?: boolean;
};

export function AdminProductForm({ product, categories, serviceMode = false }: ProductFormProps) {
  const allowedTypes = serviceMode ? ["SERVICE", "MEMBERSHIP", "KIT", "DIGITAL"] : ["PHYSICAL", "DIGITAL", "MEMBERSHIP", "KIT", "SERVICE"];

  return (
    <form action={saveProductAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Title
          <input name="title" defaultValue={product?.title} required className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Slug
          <input name="slug" defaultValue={product?.slug} required className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Short Description
        <input name="shortDescription" defaultValue={product?.shortDescription ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Description
        <textarea name="description" defaultValue={product?.description ?? ""} className="min-h-28 rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Category
          <select name="categoryId" defaultValue={product?.categoryId ?? ""} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Type
          <select name="type" defaultValue={product?.type ?? allowedTypes[0]} className="h-10 rounded-md border border-slate-300 px-3">
            {allowedTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Status
          <select name="status" defaultValue={product?.status ?? "DRAFT"} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Sort Order
          <input name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Base Price
          <input name="basePrice" type="number" step="0.01" defaultValue={product?.basePrice?.toString() ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          MRP
          <input name="mrp" type="number" step="0.01" defaultValue={product?.mrp?.toString() ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Currency
          <input name="currency" defaultValue={product?.currency ?? "INR"} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="flex items-end gap-2 text-sm font-medium">
          <input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} className="h-4 w-4" />
          Featured
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Image URL
        <input name="imageUrl" defaultValue={product?.imageUrl ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
      </label>
      <button className="w-fit rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
        Save catalog item
      </button>
    </form>
  );
}
