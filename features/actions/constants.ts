export const ACTION_ROW_BACKGROUND = require("@/assets/backgrounds/blue-rect-card.png");

/** Water detail summary card (same tile as action list rows). */
export const WATER_ACTION_CARD_BACKGROUND = require("@/assets/backgrounds/blue-rect-card.png");

/** Shell behind the Add Water stepper, bulk adds, and confirm button. */
export const WATER_ADD_CARD_BACKGROUND = require("@/assets/backgrounds/blue-square-card.png");
export const WATER_ACTION_CARD_ICON = require("@/assets/icons/water-drop.png");
export const WATER_RIGHT_ARROW_ICON = require("@/assets/icons/right-arrow.png");
export const WATER_SUBTRACT_ICON = require("@/assets/icons/subtract.png");
export const WATER_ADD_ICON = require("@/assets/icons/add.png");

/** Default serving size when logging water on the detail screen. */
export const WATER_SERVING_OZ = 12;

export const WATER_BULK_ADD_BACKGROUND = require("@/assets/backgrounds/bulk-add-blue.png");

/** Full-width confirm control on the water detail screen. */
export const WATER_ADD_WATER_BUTTON_BACKGROUND = require("@/assets/backgrounds/add-action.png");

/** Quick-add serving sizes (oz) on the water detail screen. */
export const WATER_BULK_SERVING_OPTIONS_OZ = [8, 12, 16, 24] as const;

/** Train detail shells: same background assets as the parallel water screens. */
export const TRAIN_ACTION_CARD_BACKGROUND = WATER_ACTION_CARD_BACKGROUND;
export const TRAIN_ADD_CARD_BACKGROUND = WATER_ADD_CARD_BACKGROUND;
export const TRAIN_ACTION_CARD_ICON = require("@/assets/icons/dumbbell.png");
export const TRAIN_ADD_TIME_BUTTON_BACKGROUND =
  WATER_ADD_WATER_BUTTON_BACKGROUND;
export const TRAIN_BULK_ADD_BACKGROUND = WATER_BULK_ADD_BACKGROUND;

/** Default increment when logging training time on the detail screen (minutes). */
export const TRAIN_SERVING_MINUTES = 15;

/** Quick-add durations on the train detail screen: label + minutes. */
export const TRAIN_BULK_DURATION_OPTIONS = [
  { label: "+15M", minutes: 15 },
  { label: "+30M", minutes: 30 },
  { label: "+1H", minutes: 60 },
  { label: "+2H", minutes: 120 },
] as const;

/** Steps detail: summary / target use rect tile; add-card matches other actions (square). */
export const STEPS_ACTION_CARD_BACKGROUND = require("@/assets/backgrounds/blue-rect-card.png");
export const STEPS_ADD_CARD_BACKGROUND = WATER_ADD_CARD_BACKGROUND;
export const STEPS_ACTION_CARD_ICON = require("@/assets/icons/lightning.png");
export const STEPS_ADD_STEPS_BUTTON_BACKGROUND =
  WATER_ADD_WATER_BUTTON_BACKGROUND;
export const STEPS_BULK_ADD_BACKGROUND = WATER_BULK_ADD_BACKGROUND;

/** Default increment when logging steps on the detail screen. */
export const STEPS_SERVING_AMOUNT = 500;

/** Quick-add step counts on the steps detail screen. */
export const STEPS_BULK_AMOUNT_OPTIONS = [
  { label: "+500", amount: 500 },
  { label: "+1,000", amount: 1_000 },
  { label: "+2,500", amount: 2_500 },
  { label: "+5,000", amount: 5_000 },
] as const;

/** Calories detail: same blue shells as water / train. */
export const CALORIES_ACTION_CARD_BACKGROUND = WATER_ACTION_CARD_BACKGROUND;
export const CALORIES_ADD_CARD_BACKGROUND = WATER_ADD_CARD_BACKGROUND;
export const CALORIES_ACTION_CARD_ICON = require("@/assets/icons/fire.png");
export const CALORIES_ADD_CALORIES_BUTTON_BACKGROUND =
  WATER_ADD_WATER_BUTTON_BACKGROUND;
export const CALORIES_BULK_ADD_BACKGROUND = WATER_BULK_ADD_BACKGROUND;

/** Default increment when logging calories on the detail screen (kcal). */
export const CALORIES_SERVING_KCAL = 50;

/** Quick-add calorie amounts on the calories detail screen. */
export const CALORIES_BULK_KCAL_OPTIONS = [
  { label: "+50", kcal: 50 },
  { label: "+100", kcal: 100 },
  { label: "+200", kcal: 200 },
  { label: "+300", kcal: 300 },
] as const;

/** Weight detail: same blue shells as water / train. */
export const WEIGHT_ACTION_CARD_BACKGROUND = WATER_ACTION_CARD_BACKGROUND;
export const WEIGHT_ADD_CARD_BACKGROUND = WATER_ADD_CARD_BACKGROUND;
export const WEIGHT_ACTION_CARD_ICON = require("@/assets/icons/scale.png");
export const WEIGHT_ADD_WEIGHT_BUTTON_BACKGROUND =
  WATER_ADD_WATER_BUTTON_BACKGROUND;
export const WEIGHT_BULK_ADD_BACKGROUND = WATER_BULK_ADD_BACKGROUND;

/** Default increment when logging weight on the detail screen (lbs). */
export const WEIGHT_SERVING_LBS = 1;

/** Quick-add weight deltas on the weight detail screen (whole lbs). */
export const WEIGHT_BULK_LB_OPTIONS = [
  { label: "+1", lbs: 1 },
  { label: "+2", lbs: 2 },
  { label: "+5", lbs: 5 },
  { label: "+10", lbs: 10 },
] as const;

/** Sleep detail: same blue shells as water / train. */
export const SLEEP_ACTION_CARD_BACKGROUND = WATER_ACTION_CARD_BACKGROUND;
export const SLEEP_ADD_CARD_BACKGROUND = WATER_ADD_CARD_BACKGROUND;
export const SLEEP_ACTION_CARD_ICON = require("@/assets/icons/purple-moon.png");
export const SLEEP_ADD_SLEEP_BUTTON_BACKGROUND =
  WATER_ADD_WATER_BUTTON_BACKGROUND;
export const SLEEP_BULK_ADD_BACKGROUND = WATER_BULK_ADD_BACKGROUND;

/** Default increment when logging sleep duration on the detail screen (minutes). */
export const SLEEP_SERVING_MINUTES = 30;

/** Quick-add sleep durations on the sleep detail screen. */
export const SLEEP_BULK_DURATION_OPTIONS = [
  { label: "+15M", minutes: 15 },
  { label: "+30M", minutes: 30 },
  { label: "+1H", minutes: 60 },
  { label: "+2H", minutes: 120 },
] as const;

/** Food detail: same blue shells as calories (kcal). */
export const FOOD_ACTION_CARD_BACKGROUND = WATER_ACTION_CARD_BACKGROUND;
export const FOOD_ACTION_CARD_ICON = require("@/assets/icons/apple.png");

/** Food detail: saved meals + recent meals list shells (large blue square tile). */
export const FOOD_SAVED_RECENT_MEALS_CARD_BACKGROUND = require("@/assets/backgrounds/blue-large-square-card.png");

/** Min height for the meal list region on saved / recent meal cards (keeps tile from looking vertically squashed). */
export const FOOD_MEALS_LIST_AREA_MIN_HEIGHT = 200;

/** Food detail: meal row control — log this meal to eaten for the day. */
export const FOOD_QUICK_ADD_MEAL_BUTTON = require("@/assets/backgrounds/quick-add-food.png");

/** Heart under the quick-add control; tap to save/unsave when wired. */
export const FOOD_MEAL_ROW_HEART_ICON = require("@/assets/icons/small-heart.png");

/** Food detail: wide action strip (`add-action.png`; same asset as other action “add” confirms). */
export const FOOD_ADD_ACTION_BUTTON_BACKGROUND = WATER_ADD_WATER_BUTTON_BACKGROUND;
/** Same background as search — custom meal + barcode match for one consistent control look. */
export const FOOD_CUSTOM_MEAL_BUTTON_BACKGROUND = FOOD_ADD_ACTION_BUTTON_BACKGROUND;
export const FOOD_BARCODE_SCANNER_BUTTON_BACKGROUND = FOOD_ADD_ACTION_BUTTON_BACKGROUND;

export const ACTION_CARD_GEAR_ICON = require("@/assets/icons/alt-gear.png");
export const ACTION_CARD_PLUS_ICON = require("@/assets/icons/plus-alt.png");

export const ACTION_BAR_CONTAINER = require("@/assets/bars/action-bar-container.png");

/** Current-value accent on each action row progress label (matches bar colors). */
export const ACTION_ROW_ACCENT_COLORS = {
  food: "#FF5C5C",
  water: "#4DA3FF",
  train: "#A8B2BD",
  sleep: "#B57CFF",
  steps: "#FFD93D",
  calories: "#FF9F43",
  weight: "#A8B2BD",
} as const;

export {
  ACTION_BAR_DISPLAY_MAX,
  ACTION_BAR_DISPLAY_MIN,
  clampActionBarPercent
} from "@/lib/action-bar-progress";

