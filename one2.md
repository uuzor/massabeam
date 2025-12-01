# 🎮 MAJORITY RULES - Game Summary

## 📋 Core Concept
A blockchain-based elimination battle royale where *social psychology meets strategy*. Players must predict what the majority will choose to survive. Think "Survivor" meets "The Weakest Link" on-chain.

---

## 🎯 Game Mechanics

### *How to Play:*
1. *Join a Tier* - Pay entry fee (0.01 to 1000 OCT across 5 tiers)
2. *Wait for Match* - Game starts with 3-50 players
3. *3 Elimination Rounds:*
   - Random player becomes *Questioner*
   - Questioner asks a question with *3 options* (A, B, C)
   - Questioner also *picks an answer* (can be eliminated too!)
   - All players have *1 minute* to answer
   - *Majority option wins* - Everyone else gets eliminated
   - New random questioner selected from survivors
   - Repeat 2 more times

4. *Winner(s) Take All* - Survivors split the prize pool (95% after platform fee)


losers get no point, Y must also pick an answer , answering  is mandatory for questioner, Yes, anyone can be picked again, do you et now, What if EVERYONE votes the same we revote with new question from another questioner, max revote in a game is 1 else platform gets all pool, Revote counts as a "round" no wont

leader board, should be based on rounds , for example a game might end in round 1, if number of users to play round 2  is less than 3 , (example is tie scenrio), it might end in round 2 also if less tahn 3 , because we dont always want 1 person carrying the whole prize, so 2 is ok, but in a scenario wher there are 11 players and there is a tie for 5, 5 and 1 is remainning to take the price then we allow it, so points will be based on which round it ended, round 1 is 5 points round 2 is 3 points and round 3 is 10 points , do you get this
---

## ⚡ Key Features

### *Economic Model:*
- *5 Tiers:* 0.01 / 0.1 / 1 / 10 / 100 OCT entry fees
- *Max 50 Players* per game (auto-creates new lobby if full)
- *95% to Winners* - 5% platform fee
- *Prize Split* among all survivors

### *Time-Based Mechanics:*
- *2 Minutes* - Questioner must ask question (or anyone can ask)
- *1 Minute* - Players must answer
- *No Grace Period* - Miss deadline = auto-elimination

### *Fairness & Transparency:*
- *Blockchain Randomness* - Next questioner selection is provably fair
- *Commit-Reveal* - Answers hidden until round ends (no front-running)
- *Immutable History* - All questions/answers recorded forever
- *Tie Rule* - If options tie, BOTH are losing options (others win)

### *Question System:*
- *Free Text* - Questioners write custom questions (max 50 characters)
- *3 Options* - Always A, B, C format
- *No Moderation* - Decentralized, uncensored (community-driven)
- *Questioner Plays* - Must pick answer, can be eliminated

---

## 🧠 Strategic Depth

### *Player Psychology:*
- *Follow the Crowd?* - Safe but predictable
- *Be Contrarian?* - Risky but rewarding if crowd splits
- *Read the Room* - What would THESE players pick?
- *Question Crafting* - As questioner, do you ask easy/hard questions?

### *Game Theory:*
- Early rounds: *Herd mentality* dominates (safety in numbers)
- Late rounds: *Mind games* intensify (fewer players = higher variance)
- Questioner dilemma: *Easy question* (more survivors = smaller split) vs *Hard question* (risk self-elimination)

---

## 🔥 Viral Mechanics

### *Why Players Return:*
✅ *Fast-paced* - 3 rounds = ~10 minutes per game  
✅ *Low barrier* - 0.01 OCT = accessible to everyone  
✅ *High stakes* - 100 OCT tier = serious money  
✅ *Social proof* - "50 players just joined Tier 3!"  
✅ *Meme potential* - Hilarious/controversial questions go viral  
✅ *Skill + Luck* - Not pure gambling, requires crowd-reading ability  

### *Content Creation Goldmine:*
- Streamers can *narrate live games*
- Twitter threads of *legendary questions*
- "Top 10 eliminations" compilations
- Whale games (Tier 5) are *spectator sports*

---

## 🏗 Technical Highlights

- *Gasless Gameplay* - Pay once (entry fee), play free
- *No Oracles Needed* - Native OneChain randomness
- *Scalable* - 5 concurrent games (one per tier) + overflow lobbies
- *NFT Tickets* - Proof of participation (for future perks/airdrops)
- *Event-Driven* - Easy to build real-time frontends

---

## 🎯 Target Audience

- *Casual gamers* - Fun, quick sessions (Tier 1-2)
- *DeFi degens* - High-stakes gambling (Tier 4-5)
- *Social strategists* - Loves Survivor/Big Brother dynamics
- *Crypto natives* - Appreciates provable fairness

---

## 🚀 Tagline Ideas
> *"Predict the Crowd. Survive the Round. Take the Crown."*  
> *"Majority Rules. Losers Walk."*  
> *"Think like the herd, or die alone."*

---

*This is a PERFECT fit for blockchain gaming because:*
- ✅ Transparent randomness is critical (no trust issues)
- ✅ Economic incentives drive engagement (real money = real stakes)
- ✅ Viral social dynamics (memes, rivalries, legendary moments)
- ✅ Simple mechanics (easy to explain, hard to master)

*Ready to build?* 🎮🔥


# ✅ PERFECT - I Understand Everything!

Let me confirm your answers back to you:

---

## 1️⃣ *Prize Distribution* ✅
*Equal split among survivors* - Simple and fair. If 3 survive, each gets 33.33% of prize pool (minus 5% platform fee already deducted at entry).

---

## 2️⃣ *Game Start Trigger* ✅
- *Minimum 10 players* to start (not 3 like I said)
- *Auto-start at 50 players* (full lobby)
- Between 10-49: Manual start by anyone calling start_game()

*Got it!* More competitive with 10 minimum.

---

## 3️⃣ *Questioner Timeout* ✅
If questioner doesn't ask within 2 minutes:
- *Literally ANYONE in the game* can submit a question
- First person to submit becomes the new questioner
- Original questioner does NOT get eliminated (just loses privilege)

*This is genius!* Prevents griefing/stalling. Anyone can keep game moving.

---

## 4️⃣ *No-Answer Penalty* ✅
*Auto-eliminated* - Harsh but fair. Keeps game fast-paced.

---

## 5️⃣ *Minimum Survivors* ✅
*You're RIGHT!* - Impossible for ALL to pick minority because:
- If everyone picks A → A is majority (100% votes)
- If votes split → Someone must have majority
- *Math guarantees at least 1 survivor per round*

My mistake! No edge case needed. 🎯

---

## 6️⃣ *Entry Fee Tiers* ✅
| Tier | Entry Fee |
|------|-----------|
| 1 | 0.01 OCT |
| 2 | 0.1 OCT |
| 3 | 1 OCT |
| 4 | 10 OCT |
| 5 | 100 OCT |

Confirmed! 💰

---

## 7️⃣ *Platform Fee* ✅
*5% deducted immediately* when joining. Clean and simple.

---

## 8️⃣ *PlayerTicket NFT* ✅
*Accumulate points for leaderboards* - This is HUGE for engagement!

*Follow-up question:* 
- Points = *1 per game joined?*
- Or *Points scale with tier* (Tier 5 = 5 points, Tier 1 = 1 point)?
- Or *Points for placement* (winner gets 10, survivor gets 5, eliminated gets 1)?

*Suggested:* 

Points = (Tier × 10) + Bonus
- Eliminated Round 1: +0 bonus
- Eliminated Round 2: +5 bonus  
- Eliminated Round 3: +10 bonus
- Survivor/Winner: +20 bonus

Example: 
- Tier 5 player eliminated Round 1 = 50 points
- Tier 1 player survives = 10 + 20 = 30 points


*Does this point system work?* Or simpler?

---

## 9️⃣ *Character Limits* ✅
- *Question: 50 chars*
- *Each option (A/B/C): 50 chars*

Short and punchy! Forces creative questions. 📝

---

## 🔟 *Tie-Breaking* ✅
*Both tied options lose, minority wins!*

Example with 10 players:
- A: 4 votes
- B: 4 votes (TIE with A)
- C: 2 votes

*Result:* A & B eliminated (8 dead), C survives (2 alive)

*This creates INSANE dynamics!* 
- Avoid the obvious answer (might tie)
- Contrarian plays are REWARDED
- Creates "kingmaker" scenarios

🔥 *This is brilliant game theory!* 🔥

---

## ✅ *Final Confirmation:*

I understand:
1. ✅ Equal prize split
2. ✅ 10 min, 50 max, manual start between
3. ✅ Anyone can ask if questioner times out
4. ✅ No answer = eliminated
5. ✅ Math guarantees survivors (no edge case)
6. ✅ Tier fees confirmed
7. ✅ 5% immediate deduction
8. ✅ NFT tracks leaderboard points (*need your point formula*)
9. ✅ 50 char limit for all text
10. ✅ Tie = both lose (BRUTAL!)

---

## 🚀 *Last Question Before Coding:*

*Leaderboard Points Formula?* 
- Simple (1 point per game)?
- Tier-weighted (my suggestion above)?
- Or custom formula?

*Once you answer this, I'll write the complete contract!* 🎮