import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const allEnglishWords = require('an-array-of-english-words');

// Essential common 5-letter words that must always be present in answers (and allowedGuesses)
const ESSENTIAL_ANSWERS = [
  'ABBEY', 'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADAPT', 'ADMIT', 'ADOPT', 'ADULT',
  'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN',
  'ALIKE', 'ALIVE', 'ALLOW', 'ALLOY', 'ALONE', 'ALONG', 'ALOUD', 'ALPHA', 'ALTER', 'AMBER',
  'AMEND', 'AMONG', 'AMPLE', 'ANGEL', 'ANGER', 'ANGLE', 'ANGRY', 'ANKLE', 'APART', 'APPLE',
  'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARMOR', 'AROMA', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET',
  'AUDIO', 'AUDIT', 'AVOID', 'AWAKE', 'AWARD', 'AWARE', 'AWFUL', 'BACON', 'BADGE', 'BAKER',
  'BASIC', 'BASIN', 'BASIS', 'BATCH', 'BEACH', 'BEARD', 'BEAST', 'BEGIN', 'BEING', 'BELLY',
  'BELOW', 'BENCH', 'BERRY', 'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'USUAL', 'BLANK', 'BLAST',
  'BLAZE', 'BLEAK', 'BLEND', 'BLESS', 'BLIND', 'BLINK', 'BLISS', 'BLOCK', 'BLOOD', 'BLOOM',
  'BLOWN', 'BLUES', 'BLUNT', 'BLUSH', 'BOARD', 'BOAST', 'BONUS', 'BOOST', 'BOOTH', 'BOUND',
  'BRAIN', 'BRAKE', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRICK', 'BRIDE',
  'BRIEF', 'BRING', 'BRINK', 'BRISK', 'BROAD', 'BROKE', 'BROOK', 'BROOM', 'BROWN', 'BRUSH',
  'BUILD', 'BUILT', 'BUNCH', 'BURST', 'BUYER', 'CABIN', 'CABLE', 'CAMEL', 'CANAL', 'CANDY',
  'CARGO', 'CARRY', 'CARVE', 'CATCH', 'CAUSE', 'CEASE', 'CEDAR', 'CHAIN', 'CHAIR', 'CHALK',
  'CHAMP', 'CHANT', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHEAT', 'CHECK', 'CHEEK',
  'CHEER', 'CHESS', 'CHEST', 'CHIEF', 'CHILD', 'CHILL', 'CHINA', 'CHOIR', 'CHORD', 'CHORE',
  'CHOSE', 'CHUNK', 'CIDER', 'CIGAR', 'CIVIC', 'CIVIL', 'CLAIM', 'CLAMP', 'CLASH', 'CLASS',
  'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIFF', 'CLIMB', 'CLING', 'CLOAK', 'CLOCK', 'CLONE',
  'CLOSE', 'CLOTH', 'CLOUD', 'CLOWN', 'COACH', 'COAST', 'COCOA', 'COLOR', 'COMET', 'COMIC',
  'CORAL', 'COUCH', 'COUGH', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRACK', 'CRAFT', 'CRANE',
  'CRASH', 'CRATE', 'CRAVE', 'CRAWL', 'CRAZE', 'CRAZY', 'CREAK', 'CREAM', 'CREED', 'CREEK',
  'CREEP', 'CREST', 'CRIME', 'CRISP', 'CROSS', 'CROWD', 'CROWN', 'CRUDE', 'CRUEL', 'CRUSH',
  'CRUST', 'CURVE', 'CYCLE', 'DAILY', 'DAIRY', 'DAISY', 'DANCE', 'DEALT', 'DEATH', 'DEBIT',
  'DEBUG', 'DEBUT', 'DECAY', 'DECOR', 'DECOY', 'DELAY', 'DELTA', 'DENSE', 'DEPOT', 'DEPTH',
  'DERBY', 'DEVIL', 'DIARY', 'DIGIT', 'DINER', 'DIRTY', 'DISCO', 'DITCH', 'DIVER', 'DIZZY',
  'DODGE', 'DONOR', 'DOUBT', 'DOUGH', 'DRAFT', 'DRAIN', 'DRAMA', 'DRANK', 'DRAPE', 'DRAWN',
  'DREAD', 'DREAM', 'DRESS', 'DRIED', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DRONE', 'DROVE',
  'DROWN', 'DRUNK', 'DRYER', 'DWELL', 'EAGER', 'EAGLE', 'EARLY', 'EARTH', 'EIGHT', 'ELBOW',
  'ELDER', 'ELECT', 'ELITE', 'EMBER', 'EMPTY', 'ENACT', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY',
  'EQUAL', 'EQUIP', 'ERASE', 'ERROR', 'ERUPT', 'ESSAY', 'ETHIC', 'EVENT', 'EVERY', 'EXACT',
  'EXALT', 'EXCEL', 'EXERT', 'EXILE', 'EXIST', 'EXTRA', 'FABLE', 'FACET', 'FAINT', 'FAIRY',
  'FAITH', 'FALSE', 'FANCY', 'FATAL', 'FAULT', 'FAVOR', 'FEAST', 'FENCE', 'FERRY', 'FEVER',
  'FIBER', 'FIELD', 'FIERY', 'FIFTH', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLAME',
  'FLANK', 'FLARE', 'FLASH', 'FLASK', 'FLEET', 'FLESH', 'FLICK', 'FLIER', 'FLING', 'FLINT',
  'FLOAT', 'FLOCK', 'FLOOD', 'FLOOR', 'FLORA', 'FLOUR', 'FLUID', 'FLUKE', 'FLUSH', 'FLUTE',
  'FOCAL', 'FOCUS', 'FORCE', 'FORGE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRANK',
  'FRAUD', 'FREAK', 'FRESH', 'FRIED', 'FRONT', 'FROST', 'FRUIT', 'FUNNY', 'GAMER', 'GAUGE',
  'GENRE', 'GHOST', 'GIANT', 'GIVEN', 'GLARE', 'GLASS', 'GLEAM', 'GLIDE', 'GLOBE', 'GLOOM',
  'GLORY', 'GLOSS', 'GLOVE', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRAPE', 'GRAPH',
  'GRASP', 'GRASS', 'GRAVE', 'GRAVY', 'GRAZE', 'GREAT', 'GREED', 'GREEN', 'GREET', 'GRIEF',
  'GRILL', 'GRIND', 'GROAN', 'GROOM', 'GROSS', 'GROUP', 'GROVE', 'GROWL', 'GROWN', 'GUARD',
  'GUESS', 'GUEST', 'GUIDE', 'GUILD', 'GUILT', 'HABIT', 'HAPPY', 'HARDY', 'HARSH', 'HASTE',
  'HASTY', 'HATCH', 'HAUNT', 'HAVEN', 'HAZARD'.slice(0, 5), 'HEART', 'HEAVY', 'HEDGE', 'HELLO',
  'HENCE', 'HERON', 'HINGE', 'HOBBY', 'HONEY', 'HONOR', 'HORSE', 'HOTEL', 'HOUND', 'HOUSE',
  'HOVER', 'HUMAN', 'HUMID', 'HUMOR', 'HURRY', 'IDEAL', 'IMAGE', 'IMPLY', 'INDEX', 'INDIE',
  'INNER', 'INPUT', 'IRONY', 'ISSUE', 'IVORY', 'JEWEL', 'JOINT', 'JOKER', 'JOLLY', 'JUDGE',
  'JUICE', 'JUICY', 'KARMA', 'KAYAK', 'KEBAB', 'KHAKI', 'KNACK', 'KNEEL', 'KNIFE', 'KNOCK',
  'KNOWN', 'LABEL', 'LABOR', 'LANCE', 'LARGE', 'LASER', 'LATCH', 'LATER', 'LAUGH', 'LAYER',
  'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEDGE', 'LEGAL', 'LEMON', 'LEVEL', 'LEVER', 'LIGHT',
  'LIMIT', 'LINEN', 'LINER', 'LIVER', 'LOBBY', 'LOCAL', 'LODGE', 'LOGIC', 'LOOSE', 'LORRY',
  'LOTUS', 'LOVER', 'LOWER', 'LOYAL', 'LUCKY', 'LUNAR', 'LUNCH', 'LYRIC', 'MACRO', 'MAGIC',
  'MAJOR', 'MAKER', 'MANGO', 'MANOR', 'MAPLE', 'MARCH', 'MARRY', 'MARSH', 'MASON', 'MATCH',
  'MAYOR', 'MEADOW'.slice(0, 5), 'MEDAL', 'MEDIA', 'MELON', 'MERCY', 'MERGE', 'MERIT', 'MERRY',
  'METAL', 'METER', 'MICRO', 'MIDST', 'MIGHT', 'MIMIC', 'MINCE', 'MINER', 'MINOR', 'MINUS',
  'MIRTH', 'MISER', 'MODEL', 'MODEM', 'MOIST', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOTTO',
  'MOUND', 'MOUNT', 'MOURN', 'MOUSE', 'MOUTH', 'MOVIE', 'MUDDY', 'MURAL', 'MUSIC', 'NAIVE',
  'NASTY', 'NAVAL', 'NERVE', 'NEVER', 'NEWER', 'NEWLY', 'NICHE', 'NIGHT', 'NINTH', 'NOBLE',
  'NOISE', 'NOISY', 'NORTH', 'NOTCH', 'NOVEL', 'NURSE', 'NYLON', 'OASIS', 'OCCUR', 'OCEAN',
  'OFFER', 'OFTEN', 'OLIVE', 'OMEGA', 'ONION', 'ONSET', 'OPERA', 'OPTIC', 'ORBIT', 'ORDER',
  'ORGAN', 'OTHER', 'OTTER', 'OUGHT', 'OUNCE', 'OUTER', 'OWNER', 'OXIDE', 'OZONE', 'PAINT',
  'PANEL', 'PANIC', 'PAPER', 'PARTY', 'PASTA', 'PASTE', 'PATCH', 'PATIO', 'PAUSE', 'PEACE',
  'PEACH', 'PEARL', 'PEDAL', 'PENNY', 'PERCH', 'PERIL', 'PETAL', 'PETTY', 'PHASE', 'PHONE',
  'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PINCH', 'PITCH', 'PIVOT', 'PIXEL', 'PIZZA', 'PLACE',
  'PLAIN', 'PLANE', 'PLANK', 'PLANT', 'PLATE', 'PLAZA', 'PLEAD', 'PLEAT', 'PLUCK', 'PLUMB',
  'PLUME', 'PLUMP', 'PLUNGE'.slice(0, 5), 'PLUSH', 'POINT', 'POISE', 'POKER', 'POLAR', 'POLKA',
  'PORCH', 'POUCH', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR',
  'PRISM', 'PRIZE', 'PROBE', 'PRONE', 'PROOF', 'PROSE', 'PROUD', 'PROVE', 'PROWL', 'PROXY',
  'PRUNE', 'PSALM', 'PULSE', 'PUNCH', 'PUPIL', 'PUPPY', 'PURSE', 'QUACK', 'QUAIL', 'QUAKE',
  'QUALM', 'QUART', 'QUEEN', 'QUERY', 'QUEST', 'QUEUE', 'QUICK', 'QUIET', 'QUILL', 'QUILT',
  'QUIRK', 'QUITE', 'QUOTA', 'QUOTE', 'RADAR', 'RADIO', 'RAISE', 'RALLY', 'RANCH', 'RANGE',
  'RAPID', 'RATIO', 'RAZOR', 'REACH', 'REACT', 'READY', 'REALM', 'REBEL', 'REFER', 'REIGN',
  'RELAX', 'RELAY', 'RELIC', 'REMIT', 'RENEW', 'REPAY', 'REPLY', 'RESET', 'RESIN', 'RETRO',
  'RIDER', 'RIDGE', 'RIFLE', 'RIGHT', 'RIGID', 'RINSE', 'RIPEN', 'RISEN', 'RISKY', 'RIVAL',
  'RIVER', 'ROAST', 'ROBIN', 'ROBOT', 'ROCKY', 'ROGUE', 'ROMAN', 'ROOST', 'ROTOR', 'ROUGH',
  'ROUND', 'ROUTE', 'ROVER', 'ROYAL', 'RUGBY', 'RULER', 'RUMOR', 'RURAL', 'RUSTY', 'SADLY',
  'SAINT', 'SALAD', 'SALON', 'SALSA', 'SALTY', 'SANDY', 'SAUCE', 'SAUNA', 'SAVOR', 'SCALE',
  'SCALP', 'SCARE', 'SCARF', 'SCARY', 'SCENE', 'SCENT', 'JOUST', 'SCOOP', 'SCOPE', 'SCORE',
  'SCORN', 'SCOUT', 'SCRAP', 'SCREW', 'SCRUB', 'SEIZE', 'SENSE', 'SERUM', 'SERVE', 'SETUP',
  'SEVEN', 'SHADE', 'SHADY', 'SHAFT', 'SHAKE', 'SHAKY', 'SHALL', 'SHAME', 'SHAPE', 'SHARE',
  'SHARK', 'SHARP', 'SHAVE', 'SHAWL', 'SHEAR', 'SHEEN', 'SHEEP', 'SHEER', 'SHEET', 'SHELF',
  'SHELL', 'SHIFT', 'SHINE', 'SHINY', 'SHIRE', 'SHIRT', 'SHOCK', 'SHONE', 'SHOOK', 'SHOOT',
  'SHORE', 'SHORT', 'SHOUT', 'SHOVE', 'SHOWN', 'SHOWY', 'SHRUB', 'SHRUG', 'SIGHT', 'SIGMA',
  'SILKY', 'SILLY', 'SINCE', 'SIREN', 'SIXTH', 'SIXTY', 'SKATE', 'SKILL', 'SKIRT', 'SKULL',
  'SLATE', 'SLEEK', 'SLEEP', 'SLEET', 'SLEPT', 'SLICE', 'SLICK', 'SLIDE', 'SLIME', 'SLING',
  'SLOPE', 'SLOTH', 'SLUMP', 'SLUNG', 'SMALL', 'SMART', 'SMASH', 'SMEAR', 'SMELL', 'SMELT',
  'SMILE', 'SMIRK', 'SMITH', 'SMOKE', 'SMOKY', 'SNACK', 'SNAIL', 'SNAKE', 'SNARE', 'SNARL',
  'SNEAK', 'SNEER', 'SNIFF', 'SNORE', 'SNORT', 'SNOUT', 'SNOWY', 'SOAPY', 'SOBER', 'SOLAR',
  'SOLID', 'SOLVE', 'SONAR', 'SONIC', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPADE', 'SPARE',
  'SPARK', 'SPEAK', 'SPEAR', 'SPECK', 'SPEED', 'SPELL', 'SPEND', 'SPENT', 'SPICE', 'SPICY',
  'SPIED', 'SPIKE', 'SPILL', 'SPINE', 'SPIRE', 'SPITE', 'SPLIT', 'SPOIL', 'SPOKE', 'SPOON',
  'SPORT', 'SPOUT', 'SPRAY', 'SPREE', 'SQUAD', 'SQUAT', 'SQUID', 'STACK', 'STAFF', 'STAGE',
  'STAIN', 'STAIR', 'STAKE', 'STALE', 'STALK', 'STALL', 'STAMP', 'STAND', 'STARE', 'STARK',
  'START', 'STASH', 'STATE', 'STAVE', 'STEAD', 'STEAK', 'STEAL', 'STEAM', 'STEED', 'STEEL',
  'STEEP', 'STEER', 'STEIN', 'STERN', 'STICK', 'STIFF', 'STILL', 'STING', 'STINK', 'STINT',
  'STOCK', 'STOIC', 'STOKE', 'STOLE', 'STOMP', 'STONE', 'STONY', 'STOOD', 'STOOL', 'STOOP',
  'STORE', 'STORK', 'STORM', 'STORY', 'STOUT', 'STOVE', 'STRAP', 'STRAW', 'STRAY', 'STRIP',
  'STRUT', 'STUCK', 'STUDY', 'STUFF', 'STUMP', 'STUNG', 'STUNK', 'STUNT', 'STYLE', 'SUGAR',
  'SUITE', 'SULKY', 'SUNNY', 'SUPER', 'SURGE', 'SUSHI', 'SWAMP', 'SWARM', 'SWEAR', 'SWEAT',
  'SWEEP', 'SWEET', 'SWELL', 'SWEPT', 'SWIFT', 'SWINE', 'SWING', 'SWIRL', 'SWORD', 'SWORE',
  'SWORN', 'SWUNG', 'SYRUP', 'TABLE', 'TABOO', 'TACIT', 'TACKY', 'TAKEN', 'TALLY', 'TALON',
  'TANGO', 'TAPER', 'TAPIR', 'TARDY', 'TASTE', 'TASTY', 'TAUNT', 'TAWNY', 'TEACH', 'TEARY',
  'TEASE', 'TEMPO', 'TENSE', 'TENTH', 'TEPID', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE',
  'THESE', 'THICK', 'THIEF', 'THIGH', 'THING', 'THINK', 'THIRD', 'THORN', 'THOSE', 'THREE',
  'THREW', 'THROB', 'THROW', 'THRUM', 'THUMB', 'THUMP', 'THYME', 'TIARA', 'TIGER', 'TIGHT',
  'TILDE', 'TIMER', 'TIMID', 'TIPSY', 'TITAN', 'TITLE', 'TOAST', 'TODAY', 'TOKEN', 'TONAL',
  'TONIC', 'TOOTH', 'TOPAZ', 'TOPIC', 'TORCH', 'TORSO', 'TOTAL', 'TOTEM', 'TOUCH', 'TOUGH',
  'TOWEL', 'TOWER', 'TOXIC', 'TOXIN', 'TRACE', 'TRACK', 'TRACT', 'TRADE', 'TRAIL', 'TRAIN',
  'TRAIT', 'TRAMP', 'TRASH', 'TRAWL', 'TREAD', 'TREAT', 'TREND', 'TRIAD', 'TRIAL', 'TRIBE',
  'TRICK', 'TRIED', 'TRIPE', 'TRITE', 'TROLL', 'TROOP', 'TROPE', 'TROUT', 'TRUCE', 'TRUCK',
  'TRULY', 'TRUMP', 'TRUNK', 'GOOSE', 'TRUST', 'TRUTH', 'TULIP', 'TUMOR', 'PIQUE', 'TUNIC',
  'TURBO', 'TUTOR', 'TWANG', 'TWEAK', 'TWEED', 'TWEET', 'TWICE', 'TWINE', 'TWIRL', 'TWIST',
  'ULCER', 'ULTRA', 'UMBRA', 'UNCLE', 'UNDER', 'UNDID', 'UNDUE', 'UNFED', 'UNFIT', 'UNIFY',
  'UNION', 'UNITE', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USHER', 'USING',
  'UTTER', 'VAGUE', 'VALET', 'VALID', 'VALOR', 'VALUE', 'VALVE', 'VAPOR', 'VAULT', 'VAUNT',
  'VEGAN', 'VENOM', 'VENUE', 'VERGE', 'VERSE', 'VERSO', 'VERVE', 'VICAR', 'VIDEO', 'VIGIL',
  'VIGOR', 'VILLA', 'VINYL', 'VIOLA', 'VIPER', 'VIRAL', 'VIRUS', 'VISIT', 'VISOR', 'VISTA',
  'VITAL', 'VIVID', 'VIXEN', 'VOCAL', 'VODKA', 'VOGUE', 'VOICE', 'VOILA', 'VOTER', 'VOUCH',
  'VOWEL', 'WAFER', 'WAGER', 'WAGON', 'WAIST', 'WAIVE', 'WALTZ', 'WASTE', 'WATCH', 'WATER',
  'WAVER', 'WEARY', 'WEAVE', 'WEDGE', 'WEEDY', 'WEIGH', 'WEIRD', 'WELSH', 'WHACK', 'WHALE',
  'WHARF', 'WHEAT', 'WHEEL', 'WHELP', 'WHERE', 'WHICH', 'WHIFF', 'WHILE', 'WHINE', 'WHINY',
  'WHIRL', 'WHISK', 'WHITE', 'WHOLE', 'WHOOP', 'WHOSE', 'WIDEN', 'WIDER', 'WIDOW', 'WIDTH',
  'WIELD', 'WIGHT', 'WILLY', 'WIMPY', 'WINCE', 'WINCH', 'WINDY', 'WISER', 'WISPY', 'WITCH',
  'WITTY', 'WOKEN', 'WOMAN', 'WOMEN', 'WOODY', 'WOOZY', 'WORDY', 'WORLD', 'WORRY', 'WORSE',
  'WORST', 'WORTH', 'WOULD', 'WOUND', 'WOVEN', 'WRACK', 'WRATH', 'WREAK', 'WRECK', 'WREST',
  'WRING', 'WRIST', 'WRITE', 'WRONG', 'WROTE', 'WRUNG', 'YACHT', 'YEARN', 'YEAST', 'YIELD',
  'YOUNG', 'YOUTH', 'ZEBRA', 'ZESTY', 'ADIEU'
].filter((w) => /^[A-Z]{5}$/.test(w));

// Collect 3, 4, and 5-letter words from an-array-of-english-words
const words3 = new Set();
const words4 = new Set();
const rawWords5 = new Set(ESSENTIAL_ANSWERS);

for (const raw of allEnglishWords) {
  if (typeof raw !== 'string') continue;
  const upper = raw.toUpperCase();
  if (!/^[A-Z]+$/.test(upper)) continue;
  if (upper.length === 3) words3.add(upper);
  else if (upper.length === 4) words4.add(upper);
  else if (upper.length === 5) rawWords5.add(upper);
}

// English letter frequency weights for naturalness scoring
const LETTER_WEIGHTS = {
  E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1, R: 6.0,
  D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2, G: 2.0, Y: 2.0,
  P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.2, X: 0.2, Q: 0.1, Z: 0.1,
};

const COMMON_BIGRAMS = new Set([
  'TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ON', 'AT', 'EN', 'ND', 'TI', 'ES', 'OR', 'TE',
  'OF', 'ED', 'IS', 'IT', 'AL', 'AR', 'ST', 'TO', 'NT', 'NG', 'SE', 'HA', 'AS', 'OU',
  'IO', 'LE', 'VE', 'CO', 'ME', 'DE', 'HI', 'RI', 'RO', 'IC', 'NE', 'EA', 'RA', 'CE',
  'LI', 'CH', 'LL', 'BE', 'MA', 'SI', 'OM', 'UR', 'CA', 'EL', 'TA', 'LA', 'NS', 'DI',
  'FO', 'HO', 'PE', 'EC', 'PR', 'NO', 'CT', 'US', 'AC', 'OT', 'IL', 'TR', 'LY', 'NC',
  'ET', 'UT', 'SS', 'SO', 'RS', 'UN', 'LO', 'WA', 'GE', 'IE', 'WH', 'EE', 'WI', 'EM',
  'AD', 'OL', 'RT', 'PO', 'WE', 'NA', 'UL', 'NI', 'TS', 'MO', 'OW', 'PA', 'IM', 'MI',
  'AI', 'SH', 'IR', 'SU', 'ID', 'OS', 'IV', 'IA', 'AM', 'FI', 'CI', 'VI', 'PL', 'IG',
  'TU', 'EV', 'LD', 'RY', 'MP', 'FE', 'BL', 'AB', 'GH', 'TY', 'OP', 'WO', 'SA', 'AY',
  'EX', 'KE', 'FR', 'OO', 'AV', 'AG', 'IF', 'AP', 'GR', 'SP', 'RD', 'BO', 'UC', 'BU',
  'CL', 'CR', 'DR', 'FL', 'GL', 'PH', 'QU', 'SC', 'SK', 'SL', 'SM', 'SN', 'SW', 'TW',
  'WR', 'CK', 'NK', 'RK', 'LK', 'RM', 'RN', 'RP', 'FT', 'PT', 'LT', 'KT', 'XT'
]);

function scoreWord(word) {
  let score = 0;
  const seen = new Set();
  let vowels = 0;
  for (let i = 0; i < 5; i++) {
    const ch = word[i];
    score += LETTER_WEIGHTS[ch] || 0;
    seen.add(ch);
    if ('AEIOUY'.includes(ch)) vowels++;
    if (i < 4) {
      const bg = word.slice(i, i + 2);
      if (COMMON_BIGRAMS.has(bg)) score += 6;
    }
  }
  // Reward 4-5 distinct letters and 1-3 vowels
  score += seen.size * 3;
  if (vowels >= 1 && vowels <= 3) score += 8;
  else score -= 15;
  // Penalize triple repeated letters
  if (/(.)\1\1/.test(word)) score -= 50;
  return score;
}

function isSimplePluralOrInflected(word) {
  // Exclude simple 4-letter plurals ending in S (except -SS, -US, -IS, -OS)
  if (!word.endsWith('S')) return false;
  if (word.endsWith('SS') || word.endsWith('US') || word.endsWith('IS') || word.endsWith('OS')) {
    return false;
  }
  // Any non-SS/US/IS/OS word ending in S is excluded from answers.json per spec
  return true;
}

const essentialSet = new Set(ESSENTIAL_ANSWERS);
const all5Array = Array.from(rawWords5);

// Score all words for allowedGuesses (target ~12,500)
const scoredAll = all5Array
  .map((w) => ({ word: w, score: (essentialSet.has(w) ? 1000 : 0) + scoreWord(w) }))
  .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

const allowedGuessesList = scoredAll
  .slice(0, 12500)
  .map((item) => item.word)
  .sort();

// Candidate answers: not ending in simple S plural, high naturalness score
const answerCandidates = [];
for (const w of ESSENTIAL_ANSWERS) {
  if (!isSimplePluralOrInflected(w)) {
    answerCandidates.push(w);
  }
}
const answerSet = new Set(answerCandidates);

for (const { word } of scoredAll) {
  if (answerSet.size >= 2315) break;
  if (answerSet.has(word)) continue;
  if (isSimplePluralOrInflected(word)) continue;
  // Also exclude regular past-tense 3-letter+ED words that feel obscure
  if (word.endsWith('ED') && words3.has(word.slice(0, 3)) && !essentialSet.has(word)) continue;
  // Require vowel presence and at least 4 distinct letters for extra answers
  if (!/[AEIOU]/.test(word)) continue;
  if (new Set(word).size < 4) continue;
  answerSet.add(word);
  answerCandidates.push(word);
}

// Deterministically shuffle answers with Mulberry32 PRNG so daily words vary naturally
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260101);
const shuffledAnswers = [...answerCandidates];
for (let i = shuffledAnswers.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
}

// Ensure every answer is in allowedGuesses
const allowedSet = new Set(allowedGuessesList);
for (const ans of shuffledAnswers) {
  allowedSet.add(ans);
}
const finalAllowedGuesses = Array.from(allowedSet).sort();

const outDir = path.resolve('src/data');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, 'answers.json'),
  JSON.stringify(shuffledAnswers, null, 2) + '\n',
  'utf8'
);
fs.writeFileSync(
  path.join(outDir, 'allowedGuesses.json'),
  JSON.stringify(finalAllowedGuesses, null, 2) + '\n',
  'utf8'
);

console.log(`Generated src/data/answers.json (${shuffledAnswers.length} words)`);
console.log(`Generated src/data/allowedGuesses.json (${finalAllowedGuesses.length} words)`);
