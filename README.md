# Daily Quest Ascent

You are a senior full-stack engineer, game UI/UX designer, backend architect, database engineer, animation designer, and product designer.

Build a complete, production-quality, full-stack web application called:

# 🎲 DAILY STUDY DICE

### "You choose the missions. The dice chooses the path."

This is NOT a normal productivity dashboard.

It must feel like a colorful, polished, cartoon adventure game whose actual purpose is helping students complete repetitive study tasks without spending mental energy deciding what to do next.

The core psychological/product concept is:

USER CREATES TASKS

        ↓

USER ENTERS A SPECIFIC TASK SET / STUDY WORLD

        ↓

USER ROLLS THAT WORLD'S DICE ONCE

        ↓

DICE RANDOMLY GENERATES THE ORDER

        ↓

THE ORDER BECOMES LOCKED

        ↓

USER MUST FOLLOW THE ORDER

        ↓

COMPLETING TASKS MAKES THE CHARACTER CLIMB A MOUNTAIN

        ↓

FINAL TASK = SUMMIT

        ↓

NEXT LOCAL MIDNIGHT = NEW DAILY ADVENTURE AVAILABLE

The experience should feel exciting, unpredictable, visually beautiful, and game-like.

Do NOT build a generic SaaS dashboard.

Do NOT make it look like Notion, Trello, Google Tasks, Todoist, or a corporate analytics dashboard.

The main experience should feel like:

"MY DAILY STUDY ADVENTURE."

==================================================

1. CORE USER CONCEPT

==================================================

The user has a collection of independent Task Sets.

A Task Set is a group of tasks that belong together.

Examples:

Task Set:

"NEET 2028"

Tasks:

- DPP

- Module

- MTG

- PYQ

- H.C. Verma

- Question Solving

- Revision

- Flashcards

- Feynman Technique

Another Task Set:

"PHYSICS"

Tasks:

- Theory

- DPP

- Module

- PYQ

- H.C. Verma

Another:

"CHEMISTRY"

Tasks:

- Module

- MTG

- PYQ

- Revision

- Flashcards

Another:

"BIOLOGY"

Tasks:

- NCERT

- MTG

- PYQ

- Revision

- Flashcards

The user can create any number of Task Sets.

IMPORTANT:

Every Task Set is completely independent.

Each Task Set has:

- Its own tasks

- Its own dice

- Its own daily route

- Its own DailyRun

- Its own progress

- Its own completion state

- Its own history

Never mix Task Sets.

==================================================

2. HOME SCREEN — STUDY WORLDS

==================================================

The home screen should feel like a cartoon game world map.

Title:

# 🗺️ MY STUDY WORLDS

Show the user's Task Sets as colorful interactive worlds.

Example:

🎓 NEET 2028

9 missions

⚛️ PHYSICS

5 missions

🧪 CHEMISTRY

6 missions

🧬 BIOLOGY

5 missions

Each Task Set should have:

- Unique visual identity

- Cartoon illustration

- Small mascot

- Task count

- Today's progress

- "ENTER WORLD" button

Do NOT put the primary dice on the home screen.

The dice belongs to a specific Task Set.

==================================================

3. ENTERING A TASK SET

==================================================

When the user clicks:

"NEET 2028"

open the NEET 2028 Study World.

Only then display:

# 🎲 NEET 2028

# ROLL TODAY

The dice shown here must use ONLY the tasks belonging to NEET 2028.

If the user exits and enters:

"PHYSICS"

then show:

# 🎲 PHYSICS

# ROLL TODAY

The Physics dice must use ONLY Physics tasks.

Never allow:

NEET tasks to appear in Physics.

Physics tasks to appear in Biology.

Biology tasks to appear in Chemistry.

==================================================

4. ONE DICE PER TASK SET

==================================================

Each Task Set has its own independent daily dice.

For every:

USER + TASK SET + LOCAL DATE

there can be only one DailyRun.

Example on August 15:

NEET 2028:

one roll

PHYSICS:

one roll

CHEMISTRY:

one roll

BIOLOGY:

one roll

All four routes can be different.

Rolling one must never affect another.

==================================================

5. DAILY RANDOMIZATION

==================================================

When the user rolls the dice for a Task Set:

Randomly shuffle all active tasks in that Task Set.

Use a proper unbiased Fisher-Yates shuffle.

Example:

Original tasks:

A

B

C

D

E

Possible generated route:

C → A → E → B → D

Every task must appear exactly once.

No duplicates.

No missing tasks.

The randomization should happen server-side.

Do NOT trust frontend randomness as the source of truth.

==================================================

6. DICE ROLL EXPERIENCE

==================================================

The dice roll is one of the most important moments of the application.

Do NOT instantly display the generated sequence.

When the user clicks:

# 🎲 ROLL TODAY

create a polished game-like dice animation.

Animation sequence:

STEP 1:

Button receives satisfying press animation.

STEP 2:

Dice appears prominently in the center.

STEP 3:

Dice shakes.

STEP 4:

Dice rotates in 3D.

STEP 5:

Dice bounces/rolls.

STEP 6:

Task names or abstract symbols can rapidly cycle during the suspense phase.

STEP 7:

Particles appear around the dice.

STEP 8:

Dice rotation becomes faster.

STEP 9:

Suspense builds.

STEP 10:

Dice slows down.

STEP 11:

Dice performs a satisfying final bounce/landing.

STEP 12:

Short reveal sound.

STEP 13:

The generated route is revealed.

STEP 14:

Mountain route is constructed visually.

STEP 15:

"ROUTE LOCKED" animation appears.

The entire sequence should feel like a real game action.

Target duration:

approximately 1–2 seconds.

Do not make it excessively long.

==================================================

7. DICE VISUAL DESIGN

==================================================

Create a beautiful cartoon-style 3D-looking dice.

The dice should have:

- Rounded edges

- Soft shadows

- Highlights

- Depth

- Smooth rotation

- Bounce physics

- Subtle glow

- Particle effects

- Polished landing animation

Do NOT use a plain static Unicode emoji as the primary dice.

A dice emoji can be used as secondary decoration, but the main dice should be a custom animated UI/game object.

==================================================

8. DICE MUSIC + SOUND EFFECTS

==================================================

When the user rolls the dice:

# MUSIC / SOUND MUST PLAY.

The audio must synchronize with the dice animation.

Example:

0.0 sec:

button click sound

0.1 sec:

dice starts shaking

0.2 sec:

dice rolling sound begins

0.5 sec:

dice rotates faster

0.8 sec:

suspense audio rises

1.2 sec:

dice slows

1.4 sec:

dice lands

1.5 sec:

short satisfying reveal chime

1.6 sec:

route reveal

The result should feel satisfying and exciting.

==================================================

9. AUDIO SYSTEM

==================================================

Provide separate audio categories:

1. Dice Roll

2. Dice Suspense

3. Dice Reveal

4. Task Complete

5. Mission Unlock

6. Daily Adventure Complete

7. Background Adventure Music

8. Victory Music

Use only:

- Original audio

- Properly licensed audio

- Royalty-free audio

Do NOT use copyrighted cartoon theme songs.

Do NOT use copyrighted character voice clips.

==================================================

10. AUDIO SETTINGS

==================================================

Provide:

Music:

ON / OFF

Sound Effects:

ON / OFF

Music Volume:

slider

Effects Volume:

slider

Master Mute:

ON / OFF

Background music should be OFF by default.

The user can enable it.

Because the app may be opened in a study environment, never unexpectedly blast audio.

User-initiated dice interaction may trigger the dice-roll sound if effects are enabled.

==================================================

11. ROUTE GENERATION

==================================================

After the backend generates the random sequence, create a visual mountain route from that exact sequence.

Example:

Generated sequence:

PYQ

Revision

Module

DPP

MTG

The visual route becomes:

START

 ↓

PYQ

 ↓

REVISION

 ↓

MODULE

 ↓

DPP

 ↓

MTG

 ↓

SUMMIT

The order shown visually MUST exactly match the stored backend sequence.

==================================================

12. THE MOUNTAIN IS THE DAILY ROUTE

==================================================

The daily sequence must NOT appear primarily as boring cards or a checklist.

The sequence should physically exist on a mountain.

The user is metaphorically climbing the mountain.

Each task becomes a checkpoint on the mountain.

For example:

PYQ = first checkpoint

Revision = second checkpoint

Module = third checkpoint

DPP = fourth checkpoint

MTG = fifth checkpoint

The character physically travels between these checkpoints.

==================================================

13. MOUNTAIN VISUAL STYLE

==================================================

Use a beautiful fictional mountain inspired by the visual composition of Mount Fuji.

IMPORTANT:

Do NOT directly copy copyrighted artwork or photographs of Mount Fuji.

Create an original fictional mountain with:

- Symmetrical snow-capped peak

- Large central mountain

- Soft atmospheric perspective

- Japanese-inspired scenic composition

- Pink spring trees around the lower region

- Clouds around the upper mountain

- Winding paths

- Small mountain structures

- Peaceful valley

- Cartoon/adventure art style

The default environment should feel like:

# 🌸 SPRING MOUNTAIN ADVENTURE

with pink flowering trees surrounding the lower slopes.

==================================================

14. MOUNTAIN ROUTE

==================================================

The path should physically wind upward.

Do NOT simply put a mountain image behind a vertical list.

The route itself should be integrated into the environment.

Use:

- Mountain trails

- Bridges

- Stairs

- Checkpoint flags

- Small huts

- Campsites

- Observation points

- Decorative landmarks

- Original Japanese-inspired structures

- Trees

- Rocks

- Clouds

Each checkpoint should feel like a physical location.

==================================================

15. CHARACTER CLIMBING THE MOUNTAIN

==================================================

The user should have an original cartoon mascot.

When the current task is at checkpoint 1:

the character stands at checkpoint 1.

After completing it:

the character walks/climbs toward checkpoint 2.

After completing checkpoint 2:

the character climbs further.

Continue until the character reaches the summit.

This creates the visual metaphor:

# EVERY COMPLETED TASK = ANOTHER STEP UP THE MOUNTAIN

==================================================

16. CHECKPOINT STATES

==================================================

Every checkpoint has three states.

COMPLETED:

- Bright

- Glowing

- Checkmark

- Sparkles

- Completed flag

- Optional mascot celebration

CURRENT:

- Most prominent

- Glowing

- Pulsing gently

- Animated flag

- Mascot standing nearby

- "CURRENT MISSION" label

LOCKED:

- Desaturated

- Lock icon

- Slightly darker

- No active completion button

==================================================

17. NO SKIPPING

==================================================

This is a CRITICAL requirement.

Suppose today's route is:

1. PYQ

2. Revision

3. Module

4. DPP

5. MTG

The user MUST complete:

PYQ

before Revision becomes active.

The user cannot directly open or complete:

Revision

Module

DPP

MTG

while PYQ is incomplete.

After PYQ:

Revision unlocks.

After Revision:

Module unlocks.

Continue sequentially.

==================================================

18. NO DIRECT JUMPING

==================================================

The user must NOT be able to:

- Click Task 5 and complete it

- Change URL to access Task 5

- Manipulate frontend state

- Call a completion endpoint for future tasks

- Change currentIndex from the browser

- Reorder today's route

- Re-roll today's route

This must be enforced by the backend.

Frontend locking alone is NOT sufficient.

==================================================

19. BACKEND TASK COMPLETION VALIDATION

==================================================

When completing a task:

1. Authenticate user.

2. Verify DailyRun belongs to user.

3. Load DailyRun.

4. Read currentIndex.

5. Determine current task.

6. Compare requested task ID with current task ID.

7. If they differ:

   reject request.

8. If they match:

   complete task.

9. Increment currentIndex.

10. Save transactionally.

Example:

Current:

PYQ

Request:

complete(MTG)

Backend:

REJECT

Response:

TASK LOCKED

Request:

complete(PYQ)

Backend:

SUCCESS

Then:

Revision becomes current.

==================================================

20. DAILYRUN PERSISTENCE

==================================================

Once the dice generates a sequence, store it permanently.

Example:

August 15:

PYQ

Revision

Module

DPP

MTG

Store the exact sequence.

If the user:

- refreshes

- closes browser

- closes application

- restarts computer

- logs out

- logs back in

- changes device

the exact same route must return.

Never generate another route for the same user + TaskSet + localDate.

==================================================

21. DAILYRUN IDENTITY

==================================================

A DailyRun is uniquely identified by:

USER

+

TASK SET

+

LOCAL DATE

Database constraint:

UNIQUE(userId, taskSetId, localDate)

This is a HARD database constraint.

It protects against:

- Double clicking

- Multiple tabs

- Concurrent requests

- Network retries

- Accidental duplicate generation

==================================================

22. MIDNIGHT LOGIC

==================================================

The route is valid for one local calendar day.

Example:

August 15 route:

PYQ → Revision → Module → DPP → MTG

It remains unchanged throughout August 15.

At the user's local midnight:

August 16 begins.

Do NOT delete August 15.

Do NOT overwrite August 15.

Instead:

August 15 becomes historical.

August 16 can have a new DailyRun.

==================================================

23. APP CLOSED AT MIDNIGHT

==================================================

The app does NOT need to remain open.

Example:

11:50 PM:

user closes app.

12:00 AM:

app remains closed.

8:00 AM:

user opens app.

Backend calculates the current local date.

It sees:

Yesterday's DailyRun = August 15.

Current date = August 16.

Therefore:

August 15 remains history.

August 16 has no DailyRun yet.

Show:

# 🎲 NEW DAILY ADVENTURE

When the user presses Roll:

generate August 16 route.

==================================================

24. NO AUTOMATIC RANDOMIZATION WHILE CLOSED

==================================================

Do NOT silently create a new route at midnight while the app is closed.

A new DailyRun should be created when the user initiates today's roll.

The date itself determines eligibility.

==================================================

25. OLD ROUTE HISTORY

==================================================

Never overwrite old routes.

Example:

AUGUST 15:

PYQ → Revision → Module → DPP → MTG

AUGUST 16:

Module → MTG → PYQ → DPP → Revision

Both remain stored.

The user should be able to view historical adventures.

==================================================

26. ENVIRONMENT / WEATHER EFFECT SYSTEM

==================================================

The mountain environment should be customizable.

Add:

# 🌦️ CHOOSE YOUR ENVIRONMENT

Options:

🌸 SPRING

❄️ SNOW

🌧️ RAIN

🌫️ MIST

🌅 SUNSET

🌌 NIGHT

🌸 PETAL STORM

The user chooses the visual environment.

==================================================

27. SPRING ENVIRONMENT

==================================================

Default environment:

# 🌸 SPRING

Visuals:

- Pink flowering trees

- Floating pink petals

- Soft sunlight

- Gentle breeze

- Green mountain vegetation

- Soft clouds

- Warm atmosphere

This is the default Mount-Fuji-inspired mountain aesthetic.

==================================================

28. SNOW ENVIRONMENT

==================================================

Snow mode:

- Animated snowflakes

- Snow-covered trees

- Subtle wind

- Cold atmospheric lighting

- Snow particles

- Snowy mountain paths

Keep it beautiful, not visually overwhelming.

==================================================

29. RAIN ENVIRONMENT

==================================================

Rain mode:

- Animated rain

- Clouds

- Wet-looking paths

- Small puddles

- Soft mist

- Rain ambience if audio enabled

==================================================

30. MIST ENVIRONMENT

==================================================

Mist mode:

- Slow-moving mountain fog

- Clouds crossing the mountain

- Atmospheric depth

- Soft visibility

- Floating particles

==================================================

31. SUNSET ENVIRONMENT

==================================================

Sunset mode:

- Pink/orange sky

- Warm lighting

- Long soft shadows

- Glowing mountain edges

- Sunset clouds

==================================================

32. NIGHT ENVIRONMENT

==================================================

Night mode:

- Dark blue sky

- Stars

- Moon

- Mountain silhouette

- Small lights along the route

- Subtle star twinkle

==================================================

33. PETAL STORM

==================================================

Petal Storm:

- More animated pink petals

- Different sizes

- Different speeds

- Rotating petals

- Wind direction

- Beautiful cinematic effect

==================================================

34. ENVIRONMENT MUST NOT CHANGE THE ROUTE

==================================================

Changing the environment MUST NOT:

- Re-roll

- Randomize

- Modify sequence

- Reset progress

- Create a DailyRun

- Change currentIndex

Example:

Today's route:

PYQ → Revision → Module → DPP

User changes:

Spring → Snow

The route remains exactly:

PYQ → Revision → Module → DPP

Only the environment changes.

==================================================

35. ENVIRONMENT PREFERENCE PERSISTENCE

==================================================

Store user's chosen environment in their preferences.

If they select:

SNOW

and close the app:

SNOW remains selected when they return.

Allow them to change it anytime.

==================================================

36. NO REAL WEATHER API

==================================================

These are game environments.

Do NOT connect them to real-world weather.

"Snow" means the user selected a snowy game world.

It does not mean it is actually snowing outside.

==================================================

37. MOUNTAIN CAMERA

==================================================

The mountain should have an adventure-camera experience.

As the character climbs:

the camera can subtly move upward.

Beginning:

lower mountain.

Middle:

forest / cloud region.

Later:

upper mountain.

Final:

summit.

Do not make the camera disorienting.

Provide an overview option.

==================================================

38. MAP OVERVIEW

==================================================

Add:

# 🗺️ ROUTE OVERVIEW

This shows the entire mountain.

The user can see:

START

↓

Task 1

↓

Task 2

↓

Task 3

↓

...

↓

SUMMIT

Current task is highlighted.

Completed tasks are clearly marked.

Future tasks are locked.

==================================================

39. CURRENT MISSION

==================================================

The current task should be clearly visible.

Example:

# 🎯 CURRENT MISSION

## PYQ

"Complete today's PYQ session."

Button:

# START MISSION

Only the current task has an active completion action.

==================================================

40. TASK COMPLETION ANIMATION

==================================================

When the current task is completed:

1. Checkmark appears.

2. Checkpoint lights up.

3. Confetti/sparkles.

4. Character celebrates.

5. Completion sound plays.

6. Character begins moving.

7. Camera follows briefly.

8. Next checkpoint unlocks.

9. Next mission becomes current.

Display:

# 🔓 NEXT MISSION UNLOCKED!

==================================================

41. FINAL SUMMIT

==================================================

The last task should be positioned at or very near the mountain summit.

When the final task is completed:

Character reaches summit.

Trigger:

- Large celebration

- Confetti

- Sparkles

- Stars

- Mountain glow

- Summit flag animation

- Victory music

- Mascot celebration

Display:

# 🏆 SUMMIT REACHED!

Then:

# 🎉 DAILY ADVENTURE COMPLETE!

==================================================

42. ORIGINAL CARTOON CHARACTERS

==================================================

Use original characters only.

Do NOT copy:

- Doraemon

- Shinchan

- Ninja Hattori

- Kiteretsu

- Other copyrighted cartoon characters

Instead create original mascots.

Examples:

Professor Pixel:

small scientist character.

Bolt:

funny robot.

Nova:

curious explorer.

Scout:

adventure character.

Astro:

space-themed explorer.

Shadow:

original ninja-inspired character.

These must be original designs.

==================================================

43. RANDOM CHARACTER REACTIONS

==================================================

After completing a task, randomly select an appropriate mascot reaction.

Examples:

"Brilliant!"

"Mission cleared!"

"Next checkpoint unlocked!"

"Great thinking!"

"Another step upward!"

"Keep climbing!"

Do not use long dialogues.

The character should appear briefly and then return to the environment.

==================================================

44. GAME-LIKE PROGRESS

==================================================

Display:

TODAY:

3 / 9 MISSIONS

Use an animated progress indicator.

Do not make statistics the dominant part of the UI.

The mountain adventure remains the primary experience.

==================================================

45. STREAKS

==================================================

If all missions of a Task Set are completed for the day:

increase that Task Set's streak.

Example:

🔥 12 DAY STREAK

Do not punish missed days.

Do not shame the user.

==================================================

46. ACHIEVEMENTS

==================================================

Examples:

7 completed adventures:

🏆 FIRST ADVENTURE

30:

🌟 EXPLORER

100:

🚀 MASTER EXPLORER

Achievements should celebrate consistency without becoming manipulative.

==================================================

47. DO NOT ADD GAMBLING

==================================================

This is a study game, not a gambling game.

Do NOT include:

- Betting

- Loot boxes

- Gambling mechanics

- Paid random rewards

- Artificial scarcity

- Random purchases

- Punishment systems

The randomness should only determine:

THE ORDER OF USER-CREATED STUDY TASKS.

==================================================

48. TASK SET CREATION

==================================================

Allow:

# + CREATE NEW STUDY WORLD

Fields:

World Name

Example:

NEET 2028

Tasks:

DPP

Module

MTG

PYQ

Revision

Allow:

- Add task

- Remove task

- Rename task

- Edit task

- Reorder task

- Delete Task Set

- Rename Task Set

==================================================

49. TASK SET MODIFICATION RULE

==================================================

If today's route has already been generated:

DO NOT alter today's stored sequence.

Example:

Today's route:

A → C → B → D

User adds:

E

Today's route remains:

A → C → B → D

E can participate in future routes.

If a task is deleted while it is already part of today's active route, preserve enough snapshot information inside DailyRun so today's route can still be completed safely.

==================================================

50. GOOGLE LOGIN

==================================================

Implement REAL Google OAuth.

Do not build fake login.

Login screen should match the cartoon world.

Example:

A mascot holding a dice.

Text:

# 🎲 WELCOME, EXPLORER!

"Your study adventure is waiting."

Button:

# CONTINUE WITH GOOGLE

==================================================

51. USER DATA PERSISTENCE

==================================================

Persist:

- User account

- Task Sets

- Tasks

- DailyRuns

- Routes

- Current index

- Completed tasks

- History

- Streaks

- Achievements

- Environment preference

- Music preference

- Sound preference

- Animation preference

- Timezone

==================================================

52. MULTI-DEVICE

==================================================

The same Google account should work across:

- Desktop

- Laptop

- Tablet

- Mobile

All data must synchronize.

If a task is completed on one device, another device should eventually reflect the updated state.

==================================================

53. DATABASE

==================================================

Use a production-quality relational database or equivalent robust persistent database.

Architecture should comfortably support approximately:

# 30,000 USERS

Use:

- Proper indexing

- Constraints

- Transactions

- Efficient queries

- Pagination for history

- Server-side authorization

Important indexes:

userId

taskSetId

localDate

(userId, taskSetId, localDate)

==================================================

54. DATABASE SCHEMA

==================================================

USER

id

googleId

name

email

avatar

timezone

createdAt

lastLoginAt

TASK SET

id

userId

name

createdAt

updatedAt

TASK

id

taskSetId

title

description

position

createdAt

updatedAt

DAILY RUN

id

userId

taskSetId

localDate

sequence

currentIndex

completedTasks

rolledAt

completedAt

createdAt

USER SETTINGS

id

userId

environment

musicEnabled

effectsEnabled

musicVolume

effectsVolume

masterMute

animationMode

USER STATISTICS

userId

currentStreak

longestStreak

totalCompletedTasks

totalCompletedDays

==================================================

55. DAILYRUN IMMUTABILITY

==================================================

Once created:

These MUST NOT change:

localDate

taskSetId

sequence

Only progression fields may change:

completedTasks

currentIndex

completedAt

The route itself is immutable.

==================================================

56. API DESIGN

==================================================

Implement robust backend APIs.

Example:

GET:

user's Task Sets

POST:

create Task Set

PATCH:

update Task Set

DELETE:

delete Task Set

GET:

Task Set details

POST:

create/get today's DailyRun

GET:

today's DailyRun

POST:

complete current task

GET:

DailyRun history

PATCH:

user settings

==================================================

57. IDEMPOTENT ROLL

==================================================

The roll endpoint must be idempotent.

If the user presses Roll twice quickly:

DO NOT create two routes.

If DailyRun already exists:

return existing DailyRun.

If two simultaneous requests occur:

database uniqueness + transaction handling must ensure only one route is created.

==================================================

58. DAILYRUN CREATION LOGIC

==================================================

Implement:

getOrCreateDailyRun(userId, taskSetId, localDate)

Process:

1. Authenticate.

2. Verify TaskSet ownership.

3. Determine local date.

4. Search for existing DailyRun.

5. If found:

   return exact existing route.

6. If not found:

   fetch active tasks.

7. Shuffle using Fisher-Yates.

8. Create DailyRun.

9. currentIndex = 0.

10. Save.

11. Return route.

==================================================

59. TASK COMPLETION LOGIC

==================================================

Implement:

completeCurrentTask(userId, dailyRunId, taskId)

Process:

1. Authenticate.

2. Verify ownership.

3. Load DailyRun.

4. Read currentIndex.

5. Determine expected task.

6. Compare taskId.

7. Reject if not expected.

8. Mark expected task complete.

9. Increment currentIndex.

10. If final task:

    set completedAt.

11. Save transactionally.

==================================================

60. MULTIPLE TAB PROTECTION

==================================================

If user opens the same Task Set in multiple tabs:

Both tabs should reference the same DailyRun.

If Task 1 completes in Tab A:

Tab B should synchronize.

Use appropriate:

- polling

- websocket

- server state refresh

- or another reliable synchronization strategy

Do not create duplicate routes.

==================================================

61. SECURITY

==================================================

Never trust:

- client user IDs

- client currentIndex

- client sequence

- client completion status

All important state must be server-authoritative.

Users must only access their own data.

==================================================

62. RESPONSIVE DESIGN

==================================================

Support:

Desktop

Laptop

Tablet

Mobile

The mountain should scale correctly.

On smaller screens:

- Keep current task obvious.

- Keep dice accessible.

- Allow vertical scrolling.

- Preserve mountain atmosphere.

- Avoid tiny unreadable task labels.

==================================================

63. ACCESSIBILITY

==================================================

Support:

- Keyboard navigation

- Screen reader labels

- Accessible focus states

- Adequate contrast

- Large touch targets

- Reduced motion

- Audio controls

==================================================

64. REDUCED MOTION

==================================================

Settings:

Animation:

FULL

REDUCED

OFF

Respect prefers-reduced-motion when possible.

If reduced motion is selected:

- Reduce dice rotation

- Reduce particle count

- Reduce camera movement

- Reduce character movement

- Keep functional state clear

==================================================

65. VISUAL STYLE

==================================================

Overall style:

Colorful

Cartoonish

Warm

Adventurous

Playful

Beautiful

Polished

Use:

- Soft gradients

- Rounded shapes

- Cartoon illustrations

- Atmospheric depth

- Gentle shadows

- Animated particles

- Adventure-game UI

Avoid:

- Corporate gray

- Excessive tables

- Spreadsheet appearance

- Generic SaaS cards

- Overly minimal UI

==================================================

66. PERFORMANCE

==================================================

The application must remain smooth.

Optimize:

- Particle effects

- Animations

- Audio

- Images

- Mountain rendering

- Mobile performance

Prefer:

CSS transforms

Canvas

WebGL where appropriate

GPU-friendly animation

Do not create thousands of unnecessary DOM elements for snow/rain/petals.

==================================================

67. LOADING EXPERIENCE

==================================================

Do not show a boring blank loading screen.

Use a small cartoon loading state.

Example:

A mascot climbing a tiny mountain.

Text:

# PREPARING YOUR ADVENTURE...

==================================================

68. ERROR STATES

==================================================

Network:

"🌧️ The connection wandered off."

Button:

TRY AGAIN

Roll failure:

"🎲 The dice got stuck."

Button:

TRY AGAIN

Database error:

"🏕️ Our mountain camp is temporarily unavailable."

Do not expose technical stack traces to users.

Log technical errors securely for developers.

==================================================

69. FIRST-TIME USER FLOW

==================================================

Google Login

↓

WELCOME, EXPLORER!

↓

CREATE YOUR FIRST STUDY WORLD

↓

Name the world

↓

Add tasks

↓

Enter world

↓

Choose environment

↓

Press:

# 🎲 ROLL TODAY

↓

Dice animation

↓

Music/SFX

↓

Random route

↓

Mountain route reveal

↓

Route locked

↓

First mission unlocked

==================================================

70. RETURNING USER FLOW

==================================================

Google login/session restored

↓

MY STUDY WORLDS

↓

User enters Task Set

↓

Backend checks today's local DailyRun

IF NO DAILYRUN:

show:

# 🎲 NEW ADVENTURE AVAILABLE

IF DAILYRUN EXISTS:

show exact stored route.

Do NOT roll again.

==================================================

71. EXAMPLE FULL EXPERIENCE

==================================================

User enters:

NEET 2028

Tasks:

DPP

Module

MTG

PYQ

Revision

Flashcards

User chooses:

🌸 SPRING

Mountain environment appears.

Pink trees surround the lower slopes.

Clouds drift around the mountain.

User presses:

# 🎲 ROLL TODAY

Dice shakes.

Dice rotates.

🎵 Rolling sound plays.

Particles appear.

Suspense builds.

Dice lands.

Backend has generated:

PYQ

Flashcards

Module

DPP

Revision

MTG

Mountain path begins forming.

First checkpoint:

🎯 PYQ

Second:

🧠 FLASHCARDS

Third:

⚛️ MODULE

Fourth:

🎯 DPP

Fifth:

📚 REVISION

Sixth:

📖 MTG

Final checkpoint:

🏆 SUMMIT

Display:

# 🔒 ROUTE LOCKED

Character starts at PYQ.

User completes PYQ.

Character celebrates.

🎵 Completion sound.

Character climbs to Flashcards.

Flashcards unlock.

User completes Flashcards.

Character climbs higher.

Continue.

After MTG:

Character reaches summit.

Mountain glows.

Stars appear.

Confetti.

Victory music.

Display:

# 🏆 SUMMIT REACHED!

# 🎉 DAILY ADVENTURE COMPLETE!

==================================================

72. CRITICAL DATE EXAMPLE

==================================================

AUGUST 15:

NEET route:

PYQ → Flashcards → Module → DPP → Revision → MTG

This exact route must remain stored throughout August 15.

User closes app.

User logs out.

User returns later.

Same route.

At August 16:

August 15 route becomes historical.

No new route is automatically generated while app is closed.

User enters NEET 2028.

Show:

# 🎲 NEW ADVENTURE AVAILABLE

User rolls.

New sequence generated.

==================================================

73. CRITICAL MULTI-TASK-SET EXAMPLE

==================================================

August 15:

NEET 2028:

PYQ → Revision → Module → DPP

Physics:

H.C. Verma → PYQ → DPP → Module

Chemistry:

MTG → Revision → Module → PYQ

These must be three separate DailyRuns.

If user completes NEET PYQ:

Physics must remain untouched.

If user rolls Physics:

NEET route must remain untouched.

==================================================

74. CRITICAL NO-SKIP EXAMPLE

==================================================

Route:

A → B → C → D → E

Current:

A

User tries:

complete E

Backend:

REJECT

User completes:

A

Current:

B

User tries:

complete D

Backend:

REJECT

User completes:

B

Current:

C

This continues until E.

==================================================

75. CRITICAL ROUTE IMMUTABILITY EXAMPLE

==================================================

Today's generated route:

A → C → B → D

User changes environment:

Spring → Snow

Route remains:

A → C → B → D

User closes browser.

Route remains.

User logs out.

Route remains.

User changes device.

Route remains.

User opens two tabs.

Route remains.

User tries Roll again.

Existing route is returned.

==================================================

76. DO NOT OVERENGINEER THE UI

==================================================

The backend should be robust and production-quality.

The frontend should be visually magical but easy to understand.

The user should immediately understand:

WHERE AM I?

WHAT IS TODAY'S CURRENT TASK?

WHAT IS LOCKED?

HOW FAR HAVE I CLIMBED?

WHAT DO I DO NEXT?

The answer to the last question should always be obvious.

==================================================

77. PRIMARY USER LOOP

==================================================

The final product should reduce the daily decision to:

# ENTER

↓

# ROLL

↓

# FOLLOW

↓

# COMPLETE

↓

# CLIMB

↓

# REACH SUMMIT

The user should not have to decide the order of repetitive study resources every day.

==================================================

78. FINAL NON-NEGOTIABLE REQUIREMENTS

==================================================

The final application MUST contain:

AUTHENTICATION:

- Real Google OAuth

- Persistent sessions

- Secure authorization

TASK SETS:

- Multiple Task Sets

- Completely independent Task Sets

- Separate dice per Task Set

- Dice visible inside selected Task Set

- User-created tasks

RANDOMIZATION:

- Server-side randomization

- Fisher-Yates shuffle

- Every task exactly once

- No duplicates

- No omissions

DAILY ROUTES:

- One DailyRun per User + TaskSet + LocalDate

- Database unique constraint

- Route stored permanently

- Route immutable

- No re-roll

- No accidental duplicate route

DATE LOGIC:

- User-local date

- Local midnight boundary

- App does not need to remain open

- Old routes preserved

- New route available on new date

PROGRESSION:

- Strict sequential order

- No skipping

- Backend enforcement

- CurrentIndex server-authoritative

- Persistent progress

MOUNTAIN:

- Large fictional Mount-Fuji-inspired mountain

- Pink spring trees

- Winding mountain route

- Physical checkpoints

- Character climbing

- Summit

- Camera progression

- Route overview

ENVIRONMENTS:

- Spring

- Snow

- Rain

- Mist

- Sunset

- Night

- Petal Storm

- User selection

- Persistent preference

- Does not alter route

DICE:

- Large custom animated dice

- 3D-style rotation

- Shake

- Bounce

- Landing animation

- Particles

- Suspense

- Route reveal

AUDIO:

- Dice roll sound

- Dice suspense

- Dice reveal

- Task completion sound

- Unlock sound

- Victory sound

- Optional background music

- Volume controls

- Master mute

- Music OFF by default

- Original/licensed/royalty-free audio only

CHARACTERS:

- Original cartoon mascots

- Random completion reactions

- Character movement

- Character climbing

- Summit celebration

GAME EFFECTS:

- Confetti

- Sparkles

- Stars

- Petals

- Snow

- Rain

- Fog

- Clouds

- Glowing checkpoints

ACCOUNT:

- Google login

- Persistent user data

- Multi-device synchronization

DATABASE:

- Production-quality persistence

- Approximately 30,000 users

- Proper indexes

- Unique constraints

- Transactions

- Secure authorization

UX:

- Cartoonish

- Colorful

- Adventure-game aesthetic

- NOT a dashboard

- Responsive

- Accessible

- Reduced-motion mode

- Clear current mission

- Clear locked missions

==================================================

79. MOST IMPORTANT PRODUCT PRINCIPLE

==================================================

The app exists to remove the repeated question:

"What should I do next?"

The user defines the work once.

The system randomizes the order.

The dice removes the decision.

The mountain turns the sequence into a visible adventure.

The locked route prevents constant re-deciding.

The user only has to climb.

The intended psychological feeling is:

"I don't need to think about which resource comes next.

The mountain already decided my route.

I just need to climb today's path."

==================================================

80. FINAL PRODUCT FEEL

==================================================

When the user opens this application, it should NOT feel like:

"Here is my productivity dashboard."

It should feel like:

# 🎮 "MY STUDY ADVENTURE HAS STARTED."

The ultimate visual identity should combine:

🎲 RANDOMIZED DAILY ORDER

+

🏔️ MOUNTAIN CLIMBING

+

🌸 BEAUTIFUL CARTOON WORLD

+

🎭 ORIGINAL CHARACTERS

+

🎵 SYNCHRONIZED MUSIC

+

✨ GAME EFFECTS

+

🎯 REAL STUDY TASKS

+

🔒 STRICT SEQUENTIAL PROGRESSION

+

💾 PERSISTENT DAILY ROUTES

The core loop is:

# 🗺️ ENTER A STUDY WORLD

↓

# 🎲 ROLL THE WORLD'S DICE

↓

# 🎵 WATCH + HEAR THE DICE ROLL

↓

# 🏔️ SEE TODAY'S MOUNTAIN ROUTE APPEAR

↓

# 🔒 ROUTE LOCKS

↓

# 🎯 COMPLETE THE CURRENT MISSION

↓

# 🚶 CHARACTER CLIMBS

↓

# 🔓 NEXT CHECKPOINT UNLOCKS

↓

# 🏆 REACH THE SUMMIT

↓

# 💾 SAVE THE ADVENTURE

↓

# 🌙 NEXT LOCAL DAY

↓

# 🎲 NEW ADVENTURE

BUILD THE ACTUAL FUNCTIONAL APPLICATION, NOT A STATIC MOCKUP.

All major requirements above must be implemented in working frontend + backend + database logic.

Before considering the project complete, test these exact scenarios:

1. Create two Task Sets.

2. Roll each separately.

3. Confirm they receive independent routes.

4. Refresh the page.

5. Confirm route remains identical.

6. Close and reopen the application.

7. Confirm route remains identical.

8. Attempt to roll again on the same date.

9. Confirm no new route is generated.

10. Attempt to complete Task 4 while Task 1 is current.

11. Confirm backend rejects it.

12. Complete Task 1.

13. Confirm Task 2 unlocks.

14. Change environment from Spring to Snow.

15. Confirm route does not change.

16. Log out and log back in.

17. Confirm route and progress remain.

18. Test another device/session.

19. Confirm synchronization.

20. Simulate next local calendar day.

21. Confirm previous route becomes history.

22. Confirm no new route is silently created.

23. Roll the new day.

24. Confirm a new sequence is generated.

25. Confirm old route remains unchanged in history.

26. Double-click Roll.

27. Confirm only one DailyRun exists.

28. Open two tabs and test simultaneous actions.

29. Confirm state remains consistent.

30. Test reduced-motion mode.

31. Test music disabled.

32. Test sound effects disabled.

33. Test mobile layout.

34. Test accessibility.

35. Test authorization so one user cannot access another user's Task Sets.

Do not declare the project complete until these behaviors work correctly.

The final application should feel like a polished, colorful, magical study adventure game — while the underlying architecture remains secure, persistent, deterministic, and production-ready.

Important all sets should be stored in database with the tasks they contain

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://roll-climb-quest.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a63845bd-93f2-428e-b0ea-63c8acc842a8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
