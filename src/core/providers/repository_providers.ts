import AudioRoomModel from "../../models/audio_room/audio_room_model";
import RoomSupportModel from "../../models/audio_room/room_support_model";
import RoomSupportHistoryModel from "../../models/audio_room/room_support_history_model";
import GiftRecordModel from "../../models/gifts/gift_record_model";
import MyBucketModel from "../../models/store/my_bucket_model";
import StoreCategoryModel from "../../models/store/store_category_model";
import StoreItemModel from "../../models/store/store_item_model";
import User from "../../models/user/user_model";
import UserStats from "../../models/userstats/userstats_model";
import { AudioRoomRepository } from "../../repository/audio_room/audio_room_repository";
import { RoomSupportRepository } from "../../repository/audio_room/room_support_repository";
import { RoomSupportHistoryRepository } from "../../repository/audio_room/room_support_history_repository";
import { GiftRecordRepository } from "../../repository/gifts/gift_record_repository";
import MyBucketRepository from "../../repository/store/my_bucket_repository";
import StoreCategoryRepository from "../../repository/store/store_category_repository";
import StoreItemRepository from "../../repository/store/store_item_repository";
import UserRepository from "../../repository/users/user_repository";
import UserStatsRepository from "../../repository/users/userstats_repository";
import { MagicBallModel } from "../../models/magic_ball/magic_ball_model";
import { MagicBallRepository } from "../../repository/magic_ball/magic_ball_repository";
import { FamilyRepository } from "../../repository/family/family_repository";
import FamilyModel from "../../models/family/family_model";
import { FamilyMemberRepository } from "../../repository/family/family_member_repository";
import FamilyMemberModel from "../../models/family/family_member_model";
import { FamilyJoinRequestRepository } from "../../repository/family/family_join_request_repository";
import FamilyJoinRequestModel from "../../models/family/family_join_request_model";
import CoinBagOptionModel from "../../models/audio_room/coin_bag_option_model";
import { CoinBagOptionRepository } from "../../repository/audio_room/coin_bag_option_repository";
import CoinBagDistributionModel from "../../models/audio_room/coin_bag_distribution_model";
import { CoinBagDistributionRepository } from "../../repository/audio_room/coin_bag_distribution_repository";
import FamilyRewardConfigModel from "../../models/family/family_reward_model";
import FamilyRewardRepository from "../../repository/family/family_reward_repository";
import RoomLevelCriteriaModel from "../../models/audio_room/room_level_criteria_model";
import { RoomLevelCriteriaRepository } from "../../repository/audio_room/room_level_criteria_repository";
import RocketConfigModel from "../../models/audio_room/rocketconfig";
import { RocketConfigRepository } from "../../repository/audio_room/rocket_config_repository";
import ExchangeOptionModel from "../../models/coin_exchange/exchange_option_model";
import ExchangeTransactionHistoryModel from "../../models/coin_exchange/exchange_transaction_history_model";
import ExchangeOptionRepository from "../../repository/coin_exchange/exchange_option_repository";
import ExchangeTransactionHistoryRepository from "../../repository/coin_exchange/exchange_transaction_history_repository";
import CoinPurchaseOptionModel from "../../models/in_app_purchase/coin_purchase_option_model";
import CoinPurchaseOptionRepository from "../../repository/in_app_purchase/coin_purchase_option_repository";
import XpConfigModel from "../../models/admin/xp_config_model";
import { XpConfigRepository } from "../../repository/admin/xp_config_repository";
import SvipConfigModel from "../../models/admin/svip_config_model";
import { SvipConfigRepository } from "../../repository/admin/svip_config_repository";
import UserSvipModel from "../../models/svip/user_svip_model";
import { UserSvipRepository } from "../../repository/svip/user_svip_repository";
import FamilySupportRewardModel from "../../models/family/family_support_reward_model";
import { FamilySupportRewardRepository } from "../../repository/family/family_support_reward_repository";
import FamilySupportRewardHistoryModel from "../../models/family/family_support_reward_history_model";
import { FamilySupportRewardHistoryRepository } from "../../repository/family/family_support_reward_history_repository";

export class RepositoryProviders {
  static readonly giftRecordRepositoryProvider = new GiftRecordRepository(
    GiftRecordModel,
  );

  static readonly storeCategoryRepositoryProvider = new StoreCategoryRepository(
    StoreCategoryModel,
  );

  static readonly storeItemRepositoryProvider = new StoreItemRepository(
    StoreItemModel,
  );

  static readonly myBucketRepositoryProvider = new MyBucketRepository(
    MyBucketModel,
  );

  static readonly userRepositoryProvider = new UserRepository(User);

  static readonly userStatsRepositoryProvider = new UserStatsRepository(
    UserStats,
  );

  static readonly roomSupportRepositoryProvider = new RoomSupportRepository(
    RoomSupportModel,
  );

  static readonly roomSupportHistoryRepositoryProvider =
    new RoomSupportHistoryRepository(RoomSupportHistoryModel);

  static readonly audioRoomRepositoryProvider = new AudioRoomRepository(
    AudioRoomModel,
  );

  static readonly magicBallRepositoryProvider = new MagicBallRepository(
    MagicBallModel,
  );

  static readonly familyRepositoryProvider = new FamilyRepository(FamilyModel);
  static readonly familyMemberRepositoryProvider = new FamilyMemberRepository(
    FamilyMemberModel,
  );
  static readonly familyJoinRequestRepositoryProvider =
    new FamilyJoinRequestRepository(FamilyJoinRequestModel);

  static readonly coinBagOptionRepositoryProvider = new CoinBagOptionRepository(
    CoinBagOptionModel,
  );

  static readonly coinBagDistributionRepositoryProvider =
    new CoinBagDistributionRepository(CoinBagDistributionModel);

  static readonly familyRewardRepositoryProvider = new FamilyRewardRepository(
    FamilyRewardConfigModel,
  );
  static readonly roomLevelCriteriaRepositoryProvider =
    new RoomLevelCriteriaRepository(RoomLevelCriteriaModel);
  static readonly rocketConfigRepositoryProvider =
    new RocketConfigRepository(RocketConfigModel);
  static readonly exchangeOptionRepositoryProvider = new ExchangeOptionRepository(
    ExchangeOptionModel,
  );
  static readonly exchangeTransactionHistoryRepositoryProvider =
    new ExchangeTransactionHistoryRepository(ExchangeTransactionHistoryModel);
  static readonly coinPurchaseOptionRepositoryProvider =
    new CoinPurchaseOptionRepository(CoinPurchaseOptionModel);
  static readonly xpConfigRepositoryProvider = new XpConfigRepository(
    XpConfigModel,
  );

  static readonly svipConfigRepositoryProvider = new SvipConfigRepository(
    SvipConfigModel,
  );

  static readonly userSvipRepositoryProvider = new UserSvipRepository(
    UserSvipModel,
  );

  static readonly familySupportRewardRepositoryProvider =
    new FamilySupportRewardRepository(FamilySupportRewardModel);

  static readonly familySupportRewardHistoryRepositoryProvider =
    new FamilySupportRewardHistoryRepository(FamilySupportRewardHistoryModel);
}
