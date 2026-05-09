export enum ReactionType {
  Haha = "haha",
  Love = "love",
  Like = "like",
  Care = "care",
  Sad = "sad",
  Angry = "angry",
}

export enum DatabaseNames {
  User = "users",
  Reels = "reels",
  ReelsReactions = "reels_reactions",
  ReelsComments = "reels_comments",
  Reels_comment_reaction = "reels_comments_reactions",
  Post = "posts",
  PostReactions = "post_reactions",
  PostComments = "post_comments",
  PostCommentReactions = "post_comment_reactions",
  stories = "stories",
  story_reactions = "story_reactions",
  friendships = "friendships",
  conversations = "conversations",
  messages = "messages",
  userStats = "userstats",
  history = "histories",
  followers = "followers",
  Admin = "admins",
  Gifts = "gifts",
  PortalUsers = "portal_users",
  RoomHistory = "room-histories",
  withdrawRoomHistory = "withdraw-room-histories",
  WithdrawBonus = "withdraw-bonus",
  Salaries = "salaries",
  AgencyWithdraw = "agency-withdraw",
  Banners = "banners",
  Posters = "posters",
  CoinHistory = "coin_histories",
  AgencyJoinRequest = "agency_join_requests",
  StoreCategory = "store_categories",
  StoreItem = "store_items",
  MyBucketItem = "my_bucket_items",
  StoreItemDeleteHistory = "store_item_delete_history",
  RoomBonusRecord = "room_bonus_records",
  LevelTagBg = "level_tag_bg",
  BlockDocs = "block_docs",
  GiftAudioRoomRockets = "gift_audio_room_rockets",
  BlockedEmails = "blocked_emails",
  UpdateCost = "update_cost",
  DiamondExchange = "diamond_exchanges",
  AudioRoom = "audio_rooms",
  RecentVisitedRoom = "recent_visited_rooms",
  CurrentRoomMember = "current_room_members",
  GiftRecords = "gift_records",
  Reports = "reports",
  RoomSupport = "room_supports",
  RoomSupportHistory = "room_support_histories",
  MagicBall = "magic_balls",
  Family = "families",
  FamilyMember = "family_members",
  FamilyJoinRequest = "family_join_requests",
  CoinBagOptions = "coin_bag_options",
  CoinBagDistribution = "coin_bag_distributions",
  ActivityReward = "activity_rewards",
  FamilyRewards = "family_rewards",
}

export enum ReelStatus {
  active = "active",
  inactive = "inactive",
}

export enum UserStatus {
  active = "active",
  inactive = "inactive",
}

export enum CloudinaryFolder {
  Reels = "reels",
  UserPRofile = "user_profiles",
  PostImages = "post_images",
  PostVideos = "post_videos",
  userStories = "user_stories",
  messageImages = "message_photos",
  messageVideos = "message_videos",
  giftAssets = "gift_assets",
  BannerAssets = "banner_assets",
  PosterAssets = "poster_assets",
  LevelTagBgAssets = "level_tag_bg_assets",
}

export enum FriendshipStatus {
  accepted = "accepted",
  rejected = "rejected",
  pending = "pending",
}

export enum RequestTypes {
  sent = "sent",
  recieved = "recieved",
}

export enum MAGIC_BALL_CRITERIA_TYPES {
  SuccessfullMicInvitation = "SuccessfullMicInvitation",
  SendGiftUniqueUser = "SendGiftUniqueUser",
  SendGiftUniqueUserInRoom = "SendGiftUniqueUserInRoom",
  // NewFollower = "NewFollower",
  // KeepMicOnForDuration = "KeepMicOnForDuration",
}

export enum GlobalSocketChannels {
  RocketLaunchBanner = "rocket-launch-banner",
  GiftBanner = "gift-banner",
}

export enum AudioRoomChannels {
  NewAudioRoomCreated = "new-audio-room-created",
  AudioRoomClosed = "audio-room-closed",
  UserJoined = "user-joined",
  UserLeft = "user-left",
  hostLeft = "host-left",
  hostJoined = "host-joined",
  AudioRoomMessage = "audio-room-message",
  AudioSeatJoined = "audio-seat-joined",
  AudioSeatLeft = "audio-seat-left",
  audioAdminUpdates = "audio-admin-updates",
  muteUnmuteUser = "mute-unmute-user",
  AudioRoomDetails = "room-details",
  SendEmoji = "send-emoji",
  BanUser = "ban-audio-user",
  UnBanUser = "unban-audio-user",
  chatPrivacy = "chat-privacy",
  BasicRoomUpdate = "basic-room-update",
  LevelUp = "level-up",
  GlobalBanner = "global-banner",
  NewRocketFuelPercentage = "new-rocket-fuel-percentage",
  LaunchRocket = "rocket-launch",
  NewRocketLevel = "new-rocket-level",
  MicInviteRequest = "mic-invite-request",
  RoomData = "room-data",
  SentAudioGift = "sent-audio-gift",
  NewCoinBag = "new-coin-bag",
}

export enum MagicBallChallengeTypes {
  UserInviteToMicSuccessfully = "user-invite-to-mic-successfully",
}

// export enum SocketChannels {
//   newMessage = "newMessage",
//   newConversation = "newConversation",
//   createRoom = "create-room",
//   deleteRoom = "delete-room",
//   makeAdmin = "make-admin",
//   muteUser = "mute-user",
//   roomList = "room-list",
//   joinRoom = "join-room",
//   joinCallReq = "join-call-request",
//   joinCallReqList = "join-call-request-list",
//   acceptCallReq = "accept-call-request",
//   broadcasterList = "broadcaster-list",
//   removeBroadCaster = "remove-broadcaster",
//   broadcasterDetails = "broadcaster-details",
//   leaveRoom = "leave-room",
//   userJoined = "user-joined",
//   userLeft = "user-left",
//   banUser = "ban-user",
//   bannedList = "banned-list",
//   userBanned = "user-banned",
//   roomClosed = "room-closed",
//   inviteUser = "invite-user",
//   invited = "invited",
//   NewRocketFuelPercentage = "new-rocket-fuel-percentage",
//   getRooms = "get-rooms",
//   error = "error-message",
//   sendGift = "sent-gift",
//   sendMessage = "sent-message",
//   updateHostBonus = "update-host-bonus",
//   updateHostCoins = "update-host-coins",
//   GetVideoHosts = "get-video-hosts",
//   UpdateHostCoin = "update-host-coin",
//   UserConnection = "user-connection",
//   XpUp = "xp-up",
//   levelUp = "level-up",
// }

// export enum SocketAudioChannels {
//   CreateAudioRoom = "create-audio-room",
//   GetAllAudioRooms = "get-all-audio-rooms",
//   JoinAudioRoom = "join-audio-room",
//   JoinHostBack = "join-host-back",
//   joinSeat = "join-audio-seat",
//   RemoveFromSeat = "remove-from-seat",
//   leaveSeat = "leave-audio-seat",
//   SendMessage = "send-audio-message",
//   RoomDetails = "audio-room-details",
//   MuteUnmute = "audio-mute-unmute",
//   LeaveAudioRoom = "leave-audio-room",
//   userLeft = "audio-user-left",
//   CloseRoom = "close-audio-room",
//   BanUser = "ban-audio-user",
//   UnBanUser = "unban-audio-user",
//   GetAudioHosts = "get-audio-hosts",
//   UpdateAudioHostCoins = "update-audio-host-coins",
//   NewRocketFuelPercentage = "new-rocket-fuel-percentage",
//   NewRocketLevel = "new-rocket-level",
//   LaunchRocket = "rocket-launch",
//   SentAudioGift = "sent-audio-gift",
//   MakeAdmin = "make-audio-admin",
//   RemoveAdmin = "remove-audio-admin",
//   SendAudioEmoji = "send-audio-emoji",
//   LockUnLockAudioSeat = "lock-unlock-audio-seat",
//   AudioUserConnection = "audio-user-connection",
//   UpdateAudioSeatCount = "update-audio-seat-count",
//   UpdateAudioAnnouncement = "update-audio-announcement",
//   UpdateAudioTitle = "update-audio-title",
//   SetAudioPrivacyStatus = "set-audio-privacy-status",
//   SetAudioChatPrivacyStatus = "set-audio-chat-privacy-status",
//   InviteUserToSeat = "invite-user-to-seat",
//   AudioSeatInvitations = "audio-seat-invitations",
//   AcceptAudioSeatInvitation = "accept-audio-seat-invitation",
//   AudioRoomSearch = "audio-room-search",
//   AudioRoomUserIdSearch = "audio-room-user-id-search",
//   GetMyAudioRoom = "get-my-audio-room",
//   RecentVisitedAudioRooms = "recent-visited-audio-rooms",
//   ClearChatHistory = "audio-clear-chat-history",
//   LockAllSeat = "audio-lock-all-seat",
//   UnlockAllSeats = "audio-unlock-all-seat",
//   RoomLevelUp = "audio-room-level-up",
//   AddRoomPartners = "add-audio-room-partners",
//   RemoveRoomPartners = "remove-audio-room-partners",
//   RoomSupportReward = "room-support-reward",
//   GetRoomSupportHistory = "get-room-support-history",
//   UpdateRoomPhoto = "update-room-photo",
//   getFollowingRooms = "get-following-rooms",
//   getUsersCurrentRoom = "get-users-current-room",
// }

export enum RoomTypes {
  live = "live",
  pk = "pk",
  audio = "audio",
  party = "party",
}

export enum AudioSeatTypes {
  Regular = "regular",
  Premium = "premium",
  Host = "host",
}

export enum GiftTypes {
  rose = "rose",
  love = "love",
  car = "car",
}

export enum Gender {
  male = "Male",
  female = "Female",
  other = "Other",
}

export enum ActivityZoneState {
  safe = "safe",
  temporaryBlock = "temp_block",
  permanentBlock = "permanent_block",
}

export enum UserActiveStatus {
  online = "Online",
  offline = "Offline",
}

export enum UserRoles {
  User = "user",
  Admin = "admin",
  Merchant = "merchant",
  Reseller = "re-seller",
  SubAdmin = "sub-admin",
  Agency = "agency",
  Host = "host",
  CountryAdmin = "country-admin",
  countrySubAdmin = "country-sub-admin",
}

export enum AdminPowers {
  CoinDistribute = "coin-distributor",
  PromoteUser = "promote-user",
  UpdateUsers = "update-users",
  BlockUser = "block-user",
  DeviceBan = "device-ban",
  LiveRoomClose = "live-room-close",
  CreateUserAccount = "create-user-account",
}

export enum WhoCanTextMe {
  AllUsers = "all_users",
  MyFollowers = "my_followers",
  HighLevel = "high_level",
}

export enum WhoCanTextMeLevelTypes {
  UserLevel = "user_level",
  talentLevel = "talent_level",
}

export enum StreamType {
  Audio = "audio",
  Video = "video",
}

export enum WithdrawAccountTypes {
  Bkash = "bkash",
  Nagad = "nagad",
  Bank = "bank",
}

export enum StatusTypes {
  accepted = "accepted",
  rejected = "rejected",
  pending = "pending",
}

export enum AgencyJoinStatus {
  List = "list",
  Pending = "pending",
  Congrats = "congrats",
  member = "member",
  error = "error",
}

export enum LaunchGiftTypes {
  Coins = "coins",
  XP = "xp",
  Assets = "assets",
}

export enum RankingPeriods {
  Daily = "daily",
  Weekly = "weekly",
  Monthly = "monthly",
}

export enum FamilyJoinMode {
  Free = "free",
  Approval = "approval",
}

export enum FamilyMemberRole {
  Leader = "leader",
  CoLeader = "co-leader",
  Elder = "elder",
  Member = "member",
}

export enum GlobalBannerTypes {
  RocketBanner = "rocket_banner",
  CoinBagBanner = "coin_bag_banner",
  GiftBanner = "gift_banner",
}

export enum PrivilegeTypes {
  AntiBanChat = "anti-ban-chat",
  AntiKick = "anti-kick",
  AntiMute = "anti-mute",
}
