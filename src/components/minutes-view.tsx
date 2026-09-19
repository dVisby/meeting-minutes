interface Minutes {
  agenda: string[];
  discussion: string[];
  decisions: string[];
  next_meeting: { date: string | null; agenda: string | null } | null;
}

export function MinutesView({ minutes }: { minutes: Minutes | null }) {
  if (!minutes) {
    return <p className="text-muted-foreground text-sm">Notlar henüz hazır değil.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-sm font-medium">Gündem</h3>
        <ol className="list-inside list-decimal text-sm">
          {minutes.agenda.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-medium">Görüşülen Konular</h3>
        <ul className="list-inside list-disc text-sm">
          {minutes.discussion.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-medium">Alınan Kararlar</h3>
        <ul className="list-inside list-disc text-sm">
          {minutes.decisions.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
      {minutes.next_meeting && (minutes.next_meeting.date || minutes.next_meeting.agenda) && (
        <div>
          <h3 className="mb-1 text-sm font-medium">Sonraki Toplantı</h3>
          <p className="text-sm">
            {minutes.next_meeting.date ?? "Tarih belirtilmedi"} —{" "}
            {minutes.next_meeting.agenda ?? "Gündem belirtilmedi"}
          </p>
        </div>
      )}
    </div>
  );
}
