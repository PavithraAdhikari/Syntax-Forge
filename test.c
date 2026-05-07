#include <stdio.h>
int main() {
    int num;
    printf("Enter an integer: ");
    // &num gets the memory address of the variable
    scanf("%d", &num);
    printf("You entered: %d\n", num);
    return 0;
}