
def move_snake(snake, direction, food, grid_size=20):
    # Convert JS list to Python list
    snake_list = list(snake)
    head_x, head_y = snake_list[0]
    
    if direction == "UP": head_y -= 1
    elif direction == "DOWN": head_y += 1
    elif direction == "LEFT": head_x -= 1
    elif direction == "RIGHT": head_x += 1

    new_head = [head_x, head_y]

    # 1. Check Wall Collision
    if head_x < 0 or head_x >= grid_size or head_y < 0 or head_y >= grid_size:
        return None 
        
    # 2. Check Self Collision
    if new_head in snake_list:
        return None

    new_snake = [new_head] + snake_list
    
    # 3. Check Food Collision
    if new_head == list(food):
        return {"snake": new_snake, "ate": True}
    else:
        new_snake.pop() 
        return {"snake": new_snake, "ate": False}