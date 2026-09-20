import { NewMeetingForm } from "@/components/meetings/new-meeting-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewMeetingPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Toplantı</CardTitle>
        </CardHeader>
        <CardContent>
          <NewMeetingForm />
        </CardContent>
      </Card>
    </main>
  );
}
