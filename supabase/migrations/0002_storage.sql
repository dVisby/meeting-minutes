-- Private bucket for uploaded meeting audio (and, later, cut clip audio).
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;
