// calc consts
const MILLION = 1000000;
const THOUSAND = 1000;

// Xp features
export const ROOM_ENTRY_XP = 20;
export const OWN_ROOM_MAX_XP = 100;
export const OTHERS_ROOM_MAX_XP = 200;
export const OWN_ROOM_XP_MULTIPLIER = 10;
export const OTHERS_ROOM_XP_MULTIPLIER = 10;

// Rocket features
export const ROCKET_MILESTONES = [1000000, 2000000, 3000000, 4000000, 5000000];
export const REWARD_NUMBERS = [20, 35, 55, 75, 100];
export const COIN_MIN = 1000;
export const COIN_MAX = 10000;
export const XP_MIN = 1000;
export const XP_MAX = 10000;

// room support constants
export interface ROOM_LEVEL_CRITERIA_INTERFACE {
  level: number;
  roomVisitor: number;
  roomTransactions: number;
  totalRewardCoin: number;
  ownerCoin: number;
  partnerCoin: number;
  numberOfPartners: number;
}


export const ROOM_LEVEL_CRITERIA: ROOM_LEVEL_CRITERIA_INTERFACE[] = [
  {
    level: 1,
    roomVisitor: 20,
    roomTransactions: 3 * MILLION,
    totalRewardCoin: 420 * THOUSAND,
    ownerCoin: 330 * THOUSAND,
    partnerCoin: 90 * THOUSAND,
    numberOfPartners: 1,
  },
  {
    level: 2,
    roomVisitor: 50,
    roomTransactions: 6 * MILLION,
    totalRewardCoin: 900 * THOUSAND,
    ownerCoin: 660 * THOUSAND,
    partnerCoin: 120 * THOUSAND,
    numberOfPartners: 2,
  },
  {
    level: 3,
    roomVisitor: 75,
    roomTransactions: 12 * MILLION,
    totalRewardCoin: 1.81 * MILLION,
    ownerCoin: 1.3 * MILLION,
    partnerCoin: 170 * THOUSAND,
    numberOfPartners: 3,
  },
  {
    level: 4,
    roomVisitor: 100,
    roomTransactions: 18 * MILLION,
    totalRewardCoin: 2.72 * MILLION,
    ownerCoin: 2 * MILLION,
    partnerCoin: 240 * THOUSAND,
    numberOfPartners: 3,
  },
  {
    level: 5,
    roomVisitor: 150,
    roomTransactions: 27 * MILLION,
    totalRewardCoin: 3.88 * MILLION,
    ownerCoin: 2.8 * MILLION,
    partnerCoin: 270 * THOUSAND,
    numberOfPartners: 4,
  },
  {
    level: 6,
    roomVisitor: 200,
    roomTransactions: 36 * MILLION,
    totalRewardCoin: 5.04 * MILLION,
    ownerCoin: 3.6 * MILLION,
    partnerCoin: 360 * THOUSAND,
    numberOfPartners: 4,
  },
  {
    level: 7,
    roomVisitor: 250,
    roomTransactions: 45 * MILLION,
    totalRewardCoin: 6.35 * MILLION,
    ownerCoin: 4.3 * MILLION,
    partnerCoin: 410 * THOUSAND,
    numberOfPartners: 5,
  },
  {
    level: 8,
    roomVisitor: 300,
    roomTransactions: 60 * MILLION,
    totalRewardCoin: 8.1 * MILLION,
    ownerCoin: 5.7 * MILLION,
    partnerCoin: 480 * THOUSAND,
    numberOfPartners: 5,
  },
  {
    level: 9,
    roomVisitor: 350,
    roomTransactions: 90 * MILLION,
    totalRewardCoin: 11.55 * MILLION,
    ownerCoin: 8.5 * MILLION,
    partnerCoin: 610 * THOUSAND,
    numberOfPartners: 5,
  },
  {
    level: 10,
    roomVisitor: 400,
    roomTransactions: 120 * MILLION,
    totalRewardCoin: 15.06 * MILLION,
    ownerCoin: 11.1 * MILLION,
    partnerCoin: 660 * THOUSAND,
    numberOfPartners: 6,
  },
  {
    level: 11,
    roomVisitor: 450,
    roomTransactions: 180 * MILLION,
    totalRewardCoin: 21.67 * MILLION,
    ownerCoin: 16 * MILLION,
    partnerCoin: 945 * THOUSAND,
    numberOfPartners: 6,
  },
  {
    level: 12,
    roomVisitor: 500,
    roomTransactions: 240 * MILLION,
    totalRewardCoin: 28.8 * MILLION,
    ownerCoin: 20.4 * MILLION,
    partnerCoin: 1.2 * MILLION,
    numberOfPartners: 7,
  },
  {
    level: 13,
    roomVisitor: 600,
    roomTransactions: 360 * MILLION,
    totalRewardCoin: 42.8 * MILLION,
    ownerCoin: 30.2 * MILLION,
    partnerCoin: 1.8 * MILLION,
    numberOfPartners: 7,
  },
  {
    level: 14,
    roomVisitor: 800,
    roomTransactions: 480 * MILLION,
    totalRewardCoin: 56.4 * MILLION,
    ownerCoin: 37.2 * MILLION,
    partnerCoin: 2.4 * MILLION,
    numberOfPartners: 8,
  },
  {
    level: 15,
    roomVisitor: 1000,
    roomTransactions: 780 * MILLION,
    totalRewardCoin: 90 * MILLION,
    ownerCoin: 54.9 * MILLION,
    partnerCoin: 3.9 * MILLION,
    numberOfPartners: 9,
  },
  {
    level: 16,
    roomVisitor: 1200,
    roomTransactions: 1140 * MILLION,
    totalRewardCoin: 129.6 * MILLION,
    ownerCoin: 75.6 * MILLION,
    partnerCoin: 5.4 * MILLION,
    numberOfPartners: 10,
  },
  {
    level: 17,
    roomVisitor: 1400,
    roomTransactions: 1560 * MILLION,
    totalRewardCoin: 174 * MILLION,
    ownerCoin: 94.8 * MILLION,
    partnerCoin: 7.2 * MILLION,
    numberOfPartners: 11,
  },
  {
    level: 18,
    roomVisitor: 1700,
    roomTransactions: 2100 * MILLION,
    totalRewardCoin: 229.8 * MILLION,
    ownerCoin: 121.8 * MILLION,
    partnerCoin: 9 * MILLION,
    numberOfPartners: 12,
  },
  {
    level: 19,
    roomVisitor: 2000,
    roomTransactions: 2400 * MILLION,
    totalRewardCoin: 283.2 * MILLION,
    ownerCoin: 144 * MILLION,
    partnerCoin: 11.6 * MILLION,
    numberOfPartners: 12,
  },
  {
    level: 20,
    roomVisitor: 2000,
    roomTransactions: 3000 * MILLION,
    totalRewardCoin: 376.8 * MILLION,
    ownerCoin: 186 * MILLION,
    partnerCoin: 15.9 * MILLION,
    numberOfPartners: 12,
  },
  {
    level: 21,
    roomVisitor: 2500,
    roomTransactions: 3900 * MILLION,
    totalRewardCoin: 468 * MILLION,
    ownerCoin: 234 * MILLION,
    partnerCoin: 18 * MILLION,
    numberOfPartners: 13,
  },
  {
    level: 22,
    roomVisitor: 2500,
    roomTransactions: 5100 * MILLION,
    totalRewardCoin: 605 * MILLION,
    ownerCoin: 306 * MILLION,
    partnerCoin: 23 * MILLION,
    numberOfPartners: 13,
  },
  {
    level: 23,
    roomVisitor: 3000,
    roomTransactions: 6600 * MILLION,
    totalRewardCoin: 780.4 * MILLION,
    ownerCoin: 382.8 * MILLION,
    partnerCoin: 28.4 * MILLION,
    numberOfPartners: 14,
  },
  {
    level: 24,
    roomVisitor: 3000,
    roomTransactions: 9000 * MILLION,
    totalRewardCoin: 1045.8 * MILLION,
    ownerCoin: 504 * MILLION,
    partnerCoin: 38.7 * MILLION,
    numberOfPartners: 14,
  },
];







// level tracking

export const userLevels = [
  100000, // Level 1
  300000, // Level 2
  500000, // Level 3
  1000000, // Level 4
  1500000, // Level 5
  2100000, // Level 6
  3000000, // Level 7
  4200000, // Level 8
  5500000, // Level 9
  7000000, // Level 10
  10000000, // Level 11
  15000000, // Level 12
  25000000, // Level 13
  50000000, // Level 14
  100000000, // Level 15
  200000000, // Level 16
  400000000, // Level 17
  800000000, // Level 18
  1500000000, // Level 19
  3000000000, // Level 20
  5000000000, // Level 21
  10000000000, // Level 22
  20000000000, // Level 23
  40000000000, // Level 24
  80000000000, // Level 25
  150000000000, // Level 26
  250000000000, // Level 27
  400000000000, // Level 28
  700000000000, // Level 29
  1500000000000, // Level 30
  2000000000000, // Level 31
  2500000000000, // Level 32
  3000000000000, // Level 33
  3500000000000, // Level 34
  4000000000000, // Level 35
  7000000000000, // Level 36
  12000000000000, // Level 37
  22000000000000, // Level 38
  44000000000000, // Level 39
  100000000000000, // Level 40
];

export const xpLevels = [
  160, // Level 1
  325, // Level 2
  460, // Level 3
  625, // Level 4
  805, // Level 5
  995, // Level 6
  1175, // Level 7
  1382, // Level 8
  1618, // Level 9
  1937, // Level 10
  2332, // Level 11
  2892, // Level 12
  3602, // Level 13
  4442, // Level 14
  5427, // Level 15
  6630, // Level 16
  8010, // Level 17
  9517, // Level 18
  11215, // Level 19
  13022, // Level 20
  15009, // Level 21
  17269, // Level 22
  19567, // Level 23
  22254, // Level 24
  25207, // Level 25
  28410, // Level 26
  31810, // Level 27
  35427, // Level 28
  39228, // Level 29
  43278, // Level 30
  47614, // Level 31
  52126, // Level 32
  56982, // Level 33
  62180, // Level 34
  67928, // Level 35
  73928, // Level 36
  80356, // Level 37
  87202, // Level 38
  97002, // Level 39
  107203, // Level 40
  123767, // Level 41
  145890, // Level 42
  174319, // Level 43
  210897, // Level 44
  254555, // Level 45
  304540, // Level 46
  363509, // Level 47
  431094, // Level 48
  500617, // Level 49
  580602, // Level 50
  670860, // Level 51
  772069, // Level 52
];
