import { Star } from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";

export default function AdminTestimonials() {
  return (
    <AppLayout title="Testimoni">
      <div className="text-center py-20">
        <Star className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
        <p className="font-semibold text-muted-foreground">Kelola Testimoni</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Fitur testimoni akan segera hadir</p>
      </div>
    </AppLayout>
  );
}
