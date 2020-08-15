"use strict";

var mongoose = require("mongoose");
const { result } = require("lodash");
var Schema = mongoose.Schema;

var profileSchema = new Schema({
	userId: { type: Number, required: true },
	abilities: {
		skulk: { type: Boolean, default: true },
		lerk: { type: Boolean, default: false },
		fade: { type: Boolean, default: false },
		gorge: { type: Boolean, default: false },
		onos: { type: Boolean, default: false },
		commander: { type: Boolean, default: false }
	},
	enslo: { type: Number, default: null },
	division: { type: String, default: null },
    skill: { type: String, default: null },
    gatherElo: { type: Number, default: 0 },
	gatherMusic: { type: String, default: null }
});

profileSchema.path('userId').index({ unique: true });

profileSchema.static({
	findOrCreate: function (user, callback) {
		if (!user || typeof user.id !== 'number') return callback(new Error("Invalid user"));
		let self = this;
		self.findOne({userId: user.id}, (error, profile) => {
			if (error) return callback(error);
			if (profile) return callback(null, profile);
			self.create({userId: user.id}, (error, result) => {
				if (error) return callback(error);
				return callback(null, result);
			});
		});
    },
    async findOrCreatePromise(user) {
        if (!user || typeof user.id !== 'number') return new Error("Invalid user");
        try {
            const profile = await this.findOne({userId: user.id});
            if (profile) return profile;
            const create = await this.create({userId: user.id});
            return create;
        } catch(err) {
            return err;
        }
    }
});

profileSchema.method({
	toJson: function () {
		let output = {};
		output.abilities = this.abilities;
        output.skill = this.skill;
        output.gatherElo = this.gatherElo;
		return output;
	}
});

module.exports = mongoose.model("Profile", profileSchema);
