import { saveCategoryAction } from "@/lib/admin-actions";

type CategoryOption = {
  id: string;
  name: string;
};

type CategoryFormProps = {
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    type: string;
    status: string;
    sortOrder: number;
  };
  categories: CategoryOption[];
};

export function AdminCategoryForm({ category, categories }: CategoryFormProps) {
  return (
    <form action={saveCategoryAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Name
          <input name="name" defaultValue={category?.name} required className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Slug
          <input name="slug" defaultValue={category?.slug} required className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Description
        <textarea name="description" defaultValue={category?.description ?? ""} className="min-h-24 rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Parent
          <select name="parentId" defaultValue={category?.parentId ?? ""} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="">None</option>
            {categories
              .filter((item) => item.id !== category?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Type
          <select name="type" defaultValue={category?.type ?? "PRODUCT"} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="PRODUCT">PRODUCT</option>
            <option value="SERVICE">SERVICE</option>
            <option value="MIXED">MIXED</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Status
          <select name="status" defaultValue={category?.status ?? "ACTIVE"} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Sort Order
          <input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
      </div>
      <button className="w-fit rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
        Save category
      </button>
    </form>
  );
}
