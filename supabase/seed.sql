-- Starter blog posts. Run after schema.sql (safe to re-run).
insert into public.posts (slug, title, description, seo_title, category, body_md, status, published_at)
values ($lts$how-to-stop-doomscrolling$lts$, $lts$How to Stop Doomscrolling: 7 Strategies That Actually Work$lts$, $lts$Doomscrolling isn't a willpower problem — it's a design problem. Here are 7 practical, science-backed ways to break the endless-scroll habit without deleting your apps.$lts$, $lts$How to Stop Doomscrolling (7 Strategies That Actually Work)$lts$, $lts$Screen habits$lts$,
$lts$You open your phone to check one thing. Forty minutes later you're deep in a feed you don't even enjoy, feeling vaguely worse than when you started.

That's doomscrolling — and if it sounds familiar, you're not lacking discipline. Infinite feeds are engineered to have no natural stopping point. The good news: once you understand *why* it works on you, you can redesign the habit instead of fighting it.

## Why doomscrolling is so hard to stop

Social feeds run on **variable rewards**: most posts are forgettable, but every so often one is funny, outrageous or genuinely interesting. Never knowing when the next good one will appear is exactly what keeps you pulling — the same mechanic that makes slot machines compelling.

Add infinite scroll (no "end of page" cue) and autoplay (no decision point), and the default action is always *keep going*. Stopping requires effort; continuing requires none.

> The fix isn't more willpower. It's adding friction to the scroll and making the alternative easier.

## 1. Put a speed bump before the feed

The most effective change is the simplest: make opening a feed take a deliberate step. Move social apps off your home screen, log out after each session, or use a tool that asks you to do something first. A few seconds of friction is often enough to break the autopilot loop.

## 2. Replace, don't just remove

Habits have three parts: a cue (boredom, a notification, a pause in your day), a routine (scrolling) and a reward (novelty). If you delete the routine but leave the cue, the craving just finds another app.

Instead, keep the cue and swap the routine for something that delivers a similar hit of novelty — a short article, a quick quiz, a single chapter. You still get the "something new" feeling, but you walk away with something.

## 3. Decide your stopping point before you start

Feeds have no natural end, so give yourself one. "I'll scroll until the coffee's ready" or "one video, then back to work" is far easier to honour than a vague intention to "not scroll too long."

## 4. Kill non-essential notifications

Every notification is a cue that pulls you back into the loop. Go through your settings and turn off everything that isn't from a real person who needs you. You'll be surprised how many sessions start with a notification you didn't need.

## 5. Make your phone less rewarding to look at

Grayscale mode removes much of the visual punch that makes feeds feel exciting. It sounds trivial, but many people find their phone suddenly feels a lot more boring — which is exactly the point.

## 6. Earn your scroll

Instead of banning social media, make it the reward. Do something worthwhile *first* — read for a few minutes, learn one idea, finish one task — and *then* scroll guilt-free. This flips the dynamic: scrolling stops being the thing you're trying to avoid and becomes the thing you've earned.

This is the idea behind [LearnThenScroll](/): pick a topic you care about, read a 3-minute lesson, pass a short quiz, and then your feed unlocks. You still get to scroll — you just learn something first.

## 7. Track the trend, not the day

You'll have bad days. What matters is whether your average screen time is trending down and whether you're replacing empty scrolling with something you value. Check your weekly screen time report and look for direction, not perfection.

## The bottom line

Doomscrolling wins when scrolling is effortless and stopping is hard. Reverse that: add friction before the feed, give yourself a stopping point, and put something worthwhile in front of the scroll. Small changes to your environment beat big promises to yourself every time.
$lts$,
'published', '2026-10-26')
on conflict (slug) do nothing;

insert into public.posts (slug, title, description, seo_title, category, body_md, status, published_at)
values ($lts$microlearning-3-minutes-a-day$lts$, $lts$Microlearning: How 3 Minutes a Day Can Make You Smarter$lts$, $lts$You don't need hours of study to learn something new. Here's how microlearning works, why short daily lessons stick, and how to build the habit.$lts$, null, $lts$Learning$lts$,
$lts$Most of us like the idea of learning more — about investing, psychology, history, how AI works — but "sit down and study" rarely survives a busy week.

Microlearning takes a different approach: tiny lessons, a few minutes each, done often. It sounds too small to matter. It isn't.

## What is microlearning?

Microlearning means learning in short, focused bursts — typically one idea per session, taking just a few minutes. Instead of a two-hour course you'll never finish, you learn one concept at a time: what compound interest really does, why the sunk cost fallacy fools us, how Cialdini's principles of influence work.

## Why short lessons stick

### One idea at a time

Working memory is limited. A short lesson focused on a single concept gives that idea room to land, instead of competing with ten others.

### Spacing beats cramming

Learning research consistently finds that spreading practice out over time leads to better long-term retention than cramming the same amount into one session. A few minutes every day naturally creates that spacing.

### Testing yourself locks it in

One of the most robust findings in learning science is the **testing effect**: actively recalling information — for example, by answering quiz questions — strengthens memory far more than simply re-reading it. A short quiz after a lesson isn't a chore; it's the part that makes the lesson stick.

> Read briefly, then test yourself. That two-step loop does more for memory than an hour of passive reading.

## The real challenge: consistency

Microlearning only works if you actually do it. The easiest way to build a daily habit is to attach it to something you already do every day — like checking your phone.

Most of us pick up our phones dozens of times a day, often out of boredom. Each of those moments is a free three minutes. If even a few of them went to learning one idea instead of scrolling, that would add up to hundreds of new concepts a year.

## How to start today

1. **Choose topics you're curious about.** Interest beats obligation every time.
2. **Keep sessions tiny.** Three to five minutes, one idea.
3. **Quiz yourself.** Recall is what turns reading into knowledge.
4. **Anchor it to an existing habit.** Your morning coffee, your commute, or the moment you reach for social media.

[LearnThenScroll](/) is built around exactly this loop: choose your topics, read a 3-minute lesson, pass a short quiz — and then your feed unlocks. It turns the moment you'd normally start scrolling into a moment you get a little smarter.
$lts$,
'published', '2026-10-22')
on conflict (slug) do nothing;

insert into public.posts (slug, title, description, seo_title, category, body_md, status, published_at)
values ($lts$screen-time-limits-dont-work$lts$, $lts$Why Screen Time Limits Don't Work (And What to Do Instead)$lts$, $lts$App timers and screen time limits are easy to ignore. Here's why blocking apps usually fails — and why "earning" your scroll time works better.$lts$, null, $lts$Screen habits$lts$,
$lts$You set a 30-minute daily limit on Instagram. The warning pops up. You tap **Ignore limit for today**. Again.

If screen time limits haven't fixed your scrolling habit, you're in good company. Most people who set app limits end up bypassing them — and the reason says a lot about how habits actually work.

## The problem with blocking

Screen time limits rely on a moment of willpower at exactly the wrong time: when you're already bored, tired or procrastinating and the feed is one tap away. In that moment, "ignore limit" is the path of least resistance.

Limits also frame social media as the enemy. That creates an all-or-nothing mindset: you're either "being good" or "failing." Once you've blown the limit, there's little reason to stop — the day already feels lost.

## Habits need a replacement, not just a wall

Behaviour researchers describe habits as a loop: **cue → routine → reward**. When you're bored on the bus (cue), you scroll (routine) and get a quick hit of novelty (reward).

A screen time limit blocks the routine but leaves the cue and the craving in place. That's why blocked time so often leaks into another app, or comes back the moment the limit is lifted.

> Lasting change comes from keeping the cue, keeping a reward, and swapping the routine for something better.

## What works better: earning your scroll

Instead of a hard block, put something valuable *in front of* the feed. Before you scroll, you do a small, satisfying task — and then you're free to scroll without guilt.

This works for a few reasons:

- **It keeps the reward.** You still get your feed — just a few minutes later.
- **It adds friction at the right moment.** The task is a natural pause that breaks autopilot.
- **It removes the guilt spiral.** Scrolling becomes something you've earned, not something you're sneaking.
- **It compounds.** A few minutes of learning a day adds up to hundreds of new ideas a year.

## Make the "earn" step short and genuinely interesting

The task in front of the feed has to be quick and rewarding, or you'll resent it and find a workaround. That rules out chores and "be productive" guilt-trips. What works best is something that scratches the same itch as scrolling — novelty and curiosity — in a few minutes.

That's why we built [LearnThenScroll](/) around **3-minute lessons** on topics you choose — psychology, investing, marketing, history, AI and more — followed by a quick quiz. Pass it, and your scroll is unlocked. The quiz matters: actively recalling what you just read is one of the most reliable ways to make it stick.

## Try it for a week

If screen time limits haven't worked for you, try flipping the approach for seven days:

1. Pick two or three topics you're genuinely curious about.
2. Every time you reach for a feed, do one short lesson first.
3. Then scroll as much as you like, guilt-free.

Most people find they scroll a little less — and learn a lot more — without ever feeling like they're on a digital diet.
$lts$,
'published', '2026-10-24')
on conflict (slug) do nothing;

