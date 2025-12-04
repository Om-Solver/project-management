import prisma from "../configs/prisma.js";


// get all workspaces for user
export const getUserWorkspaces = async (req, res) => {
    try {
        const { userId } = await req.auth();
        console.log("Fetching workspaces for userId:", userId);
        
        // First, check if user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        console.log("User found:", user?.email);
        
        // Check all workspaces in database
        const allWorkspaces = await prisma.workspace.findMany();
        console.log("Total workspaces in DB:", allWorkspaces.length);
        
        // Get workspaces where user is a member OR owner
        const workspaces = await prisma.workspace.findMany({
            where: {
                OR: [
                    { members: { some: { userId: userId } } },
                    { ownerId: userId }
                ]
            },
            include: {
                members: { include: { user: true } },
                projects: {
                    include: {
                        tasks: { include: { assignee: true, comments: { include: { user: true } } } },
                        members: { include: { user: true } }
                    }
                },
                owner: true
            }
        });
        
        console.log("Found workspaces for this user:", workspaces.length);
        if (workspaces.length > 0) {
            console.log("First workspace:", workspaces[0].name, "Owner:", workspaces[0].owner?.email, "Members:", workspaces[0].members.length);
        } else {
            console.log("User has no workspaces. Checking if any workspace has this user as owner...");
            const ownedWorkspaces = await prisma.workspace.findMany({
                where: { ownerId: userId }
            });
            console.log("Workspaces owned by this user:", ownedWorkspaces.length);
        }
        
        res.json({ workspaces })

    } catch (error) {
        console.log("Error in getUserWorkspaces:", error);
        res.status(500).json({ message: error.code || error.message })
    }
}

// Add member to workspace
export const addMember = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { email, role, workspaceId, message } = req.body;

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (!workspaceId || !role) {
            return res.status(400).json({ message: "Missing required parameters" })
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" })
        }

        // fetch workspace
        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, include: { members: true } })

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" })
        }

        // Check creator has admin role
        if (!workspace.members.find((member) => member.userId === userId && member.role === "ADMIN")) {
            return res.status(401).json({ message: "You do not have admin privileges" })
        }

        // Check i user is already a member
        const existingMember = workspace.members.find((member) => member.userId === userId);

        if (existingMember) {
            return res.status(400).json({ message: "User is already a member" })
        }

        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,
                role,
                message
            }
        })

        res.json({ member, message: "Member added successfully" })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message })
    }
}