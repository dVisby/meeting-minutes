export interface ExportUtterance {
  speaker_label: string;
  start_time: number;
  end_time: number;
  text: string;
  sequence: number;
}

export interface ExportMinutes {
  agenda: string[];
  discussion: string[];
  decisions: string[];
  next_meeting: { date: string | null; agenda: string | null } | null;
}

export interface ExportActionItem {
  description: string;
  owner: string | null;
  due_date: string | null;
  status: string;
}

export interface ExportMeeting {
  title: string;
  meeting_date: string | null;
}
