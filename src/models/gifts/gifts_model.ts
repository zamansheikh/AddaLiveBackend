import mongoose from "mongoose";
import { DatabaseNames } from "../../core/Utils/enums";


const GiftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    diamonds: {
        type: Number,
        required: true
    },
    coinPrice: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    },
}, {
    timestamps: true
});


const Gifts = mongoose.model(DatabaseNames.Gifts, GiftSchema, DatabaseNames.Gifts);

export default Gifts;