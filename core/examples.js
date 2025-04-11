export const examples = {
    Example1: {
        title: "Example 1",
        content: "$$ \\left(\\neg\\left(\\exists x\\forall yP\\left(x,y\\right)\\right)\\lor\\left(\\forall x\\exists y\\neg P\\left(x,y\\right)\\right)\\land P\\left(b\\right)\\land M\\left(c\\right)\\right)\\land N\\left(a\\right) $$"
    },
    Example2: {
        title: "Example 2",
        content: "$$ \\displaylines{P\\left(a,b\\right)\\\\ O\\left(a\\right)\\\\ \\exists xP\\left(a,x\\right)\\Rightarrow\\forall xO\\left(x\\right)\\\\ O\\left(b\\right)\\Rightarrow\\bot} $$"
    },
    Example3: {
        title: "Example 3",
        content: "$$ \\displaylines{P\\left(a,b\\right)\\\\ \\forall x\\exists y\\left(\\forall z\\left(P(x,z)\\Rightarrow Q(z,y)\\right)\\land\\neg P(x,y)\\right)\\land\\exists w\\left(S(w,x)\\lor\\forall v\\left(T(v)\\Rightarrow\\neg U(w,v)\\right)\\right)} $$"
    }
};
