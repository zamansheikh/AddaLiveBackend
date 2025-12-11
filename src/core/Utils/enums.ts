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
  GiftAudioRoomRockets = 'gift_audio_room_rockets',
  BlockedEmails = 'blocked_emails',
  
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

export enum SocketChannels {
  newMessage = "newMessage",
  newConversation = "newConversation",
  createRoom = "create-room",
  deleteRoom = "delete-room",
  makeAdmin = "make-admin",
  muteUser = "mute-user",
  roomList = "room-list",
  joinRoom = "join-room",
  joinCallReq = "join-call-request",
  joinCallReqList = "join-call-request-list",
  acceptCallReq = "accept-call-request",
  broadcasterList = "broadcaster-list",
  removeBroadCaster = "remove-broadcaster",
  broadcasterDetails = "broadcaster-details",
  leaveRoom = "leave-room",
  userJoined = "user-joined",
  userLeft = "user-left",
  banUser = "ban-user",
  bannedList = "banned-list",
  userBanned = "user-banned",
  roomClosed = "room-closed",
  inviteUser = "invite-user",
  invited = "invited",
  getRooms = "get-rooms",
  error = "error-message",
  sendGift = "sent-gift",
  sendMessage = "sent-message",
  updateHostBonus = "update-host-bonus",
  updateHostCoins = "update-host-coins",
  GetVideoHosts = "get-video-hosts",
  UpdateHostCoin = "update-host-coin",
  UserConnection = "user-connection",
  
}

export enum SocketAudioChannels {
  CreateAudioRoom = "create-audio-room",
  GetAllAudioRooms = "get-all-audio-rooms",
  JoinAudioRoom = "join-audio-room",
  JoinHostBack = "join-host-back",
  joinSeat = "join-audio-seat",
  RemoveFromSeat = "remove-from-seat",
  leaveSeat = "leave-audio-seat",
  SendMessage = "send-audio-message",
  RoomDetails = "audio-room-details",
  MuteUnmute = "audio-mute-unmute",
  LeaveAudioRoom = "leave-audio-room",
  userLeft = "audio-user-left",
  CloseRoom = "close-audio-room",
  BanUser = "ban-audio-user",
  UnBanUser = "unban-audio-user",
  GetAudioHosts = "get-audio-hosts",
  UpdateAudioHostCoins = "update-audio-host-coins",
  NewRocketFuelPercentage = 'new-rocket-fuel-percentage',
  LaunchRocket = 'rocket-launch',
  SentAudioGift = 'sent-audio-gift',
  MakeAdmin = 'make-audio-admin',
  RemoveAdmin = 'remove-audio-admin',
  SendAudioEmoji = 'send-audio-emoji',
  LockUnLockAudioSeat = 'lock-unlock-audio-seat',
  AudioUserConnection = 'audio-user-connection',
  UpdateAudioSeatCount = 'update-audio-seat-count',
  UpdateAudioAnnouncement = 'update-audio-announcement',
  SetAudioPrivacyStatus = 'set-audio-privacy-status',
  SetAudioChatPrivacyStatus = 'set-audio-chat-privacy-status',
  InviteUserToSeat = 'invite-user-to-seat',
  AudioSeatInvitations = 'audio-seat-invitations',
  AcceptAudioSeatInvitation = 'accept-audio-seat-invitation',
  AudioRoomSearch = 'audio-room-search',
  GetMyAudioRoom = 'get-my-audio-room',
}

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
