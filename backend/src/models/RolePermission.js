import mongoose from "mongoose";
import { MODULE_KEYS } from "../lib/modules.js";

// One document per restrictable role. A role with no document is treated as
// fully enabled (see lib/rolePermissions.js) so nothing breaks until Admin
// explicitly restricts something via the Access Control panel.
const rolePermissionSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, unique: true, trim: true },
    enabledModules: {
      type: [{ type: String, enum: MODULE_KEYS }],
      default: () => [...MODULE_KEYS],
    },
  },
  { timestamps: true }
);

export default mongoose.models.RolePermission || mongoose.model("RolePermission", rolePermissionSchema);
