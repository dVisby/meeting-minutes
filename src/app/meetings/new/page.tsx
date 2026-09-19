import { createMeetingAction } from "@/lib/actions/meetings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewMeetingPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Toplantı</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMeetingAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Başlık</Label>
              <Input id="title" name="title" required placeholder="Haftalık Ekip Toplantısı" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetingDate">Tarih</Label>
              <Input id="meetingDate" name="meetingDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Ses dosyası (mp3, m4a, wav, aac, ogg, opus, webm, 3gp, amr, flac)</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept="audio/*,video/3gpp,video/3gpp2,.mp3,.m4a,.wav,.aac,.ogg,.oga,.opus,.webm,.3gp,.3gpp,.amr,.flac,.mp4,audio/x-m4a,audio/mp4,audio/amr,audio/3gpp,audio/flac,audio/webm,audio/opus"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Yükle ve İşle
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
