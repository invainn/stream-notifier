import mongoose, { Schema }  from 'mongoose';

// Schemas
const StreamerSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
});

const ChannelSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true},
});

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true},
});

const RoleSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true},
});

// Interfaces
export interface StreamerDoc extends mongoose.Document {
  username: string,
}

export interface ChannelDoc extends mongoose.Document {
  name: string,
}

export interface UserDoc extends mongoose.Document {
  username: string,
}

export interface RoleDoc extends mongoose.Document {
  name: string,
}

export const Streamer = mongoose.model<StreamerDoc>('Streamer', StreamerSchema);
export const Channel = mongoose.model<ChannelDoc>('Channel', ChannelSchema);
export const User = mongoose.model<UserDoc>('User', UserSchema);
export const Role = mongoose.model<RoleDoc>('Role', RoleSchema);

