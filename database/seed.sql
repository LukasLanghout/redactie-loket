-- Optional seed data. Run after creating at least one user via signup,
-- then update their role to 'admin' to manage topics:
--   update public.profiles set role='admin' where email='you@example.com';

insert into public.topics (name, description, color, icon) values
  ('Gezondheidszorg', 'Tips en ervaringen rondom zorg in Nederland', '#00bcd4', '🏥'),
  ('Onderwijs', 'Misstanden, suggesties en verhalen uit het onderwijs', '#7c4dff', '🎓'),
  ('Migratie & Asiel', 'Verhalen rondom migratie- en asielbeleid', '#ff7043', '🌍'),
  ('Wonen', 'Huurmarkt, woningnood, huisvesting', '#26a69a', '🏠'),
  ('Economie & Arbeid', 'Werk, lonen, arbeidsomstandigheden', '#cddc39', '💼')
on conflict (name) do nothing;
