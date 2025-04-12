export const examples = {
    Example1: {
        title: "Example 1",
        content: "$$  (\\neg (\\exists x\\forall yP (x,y ) )\\lor (\\forall x\\exists y\\neg P (x,y ) )\\land P (b )\\land M (c ) )\\land N (a ) $$"
    },
    Example2: {
        title: "Example 2",
        content: "$$ \\displaylines{P (a,b )\\\\ O (a )\\\\ \\exists xP (a,x ) \\Rightarrow\\forall xO (x )\\\\ O (b ) \\Rightarrow\\bot} $$"
    },
    Example3: {
        title: "Example 3",
        content: "$$ \\displaylines{P (a,b )\\\\ \\forall x\\exists y (\\forall z (P(x,z) \\Rightarrow Q(z,y) )\\land\\neg P(x,y) )\\land\\exists w (S(w,x)\\lor\\forall v (T(v) \\Rightarrow\\neg U(w,v) ) )} $$"
    }
};
