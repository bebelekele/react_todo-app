/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import * as todoService from './api/todos';
import { Todo } from './types/Todo';
import { TodoItem } from './components/TodoItem';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FilterOption } from './types/FilterOption';
import { ErrorMessage } from './types/ErrorMessage';
import { ErrorNotification } from './components/ErrorNotification';
import { TempTodo } from './components/TempTodo';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [processTodoIds, setProcessTodoIds] = useState<number[]>([]);

  const [filterOption, setFilterOption] = useState<FilterOption>(
    FilterOption.All,
  );

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<ErrorMessage | null>(null);
  const [isLoading, setLoader] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [changingValue, setChangingValue] = useState('');

  function sorterTodos(filterStatus: FilterOption) {
    switch (filterStatus) {
      case FilterOption.Active:
        return todos.filter((t: Todo) => !t.completed);
      case FilterOption.Completed:
        return todos.filter((t: Todo) => t.completed);
      default:
        return todos;
    }
  }

  function loadTodos() {
    todoService
      .getTodos()
      .then(data => {
        setTodos(data);
        setTimeout(() => inputRef.current?.focus(), 0);
      })
      .catch(() => {
        setError(ErrorMessage.Load);
      });
  }

  function creationOfTodo(title: string) {
    setLoader(true);

    const temp: Todo = {
      id: 0,
      title,
      userId: 0,
      completed: false,
    };

    setTempTodo(temp);

    todoService
      .createTodo({ title })
      .then(createdTodo => {
        setTodos(prev => [...prev, createdTodo]);
        setInput('');
      })
      .catch(() => {
        setError(ErrorMessage.Add);
      })
      .finally(() => {
        setTempTodo(null);
        setTimeout(() => inputRef.current?.focus(), 0);
        setLoader(false);
      });
  }

  function deleteTodo(todoId: number) {
    setProcessTodoIds(ids => [...ids, todoId]);

    setLoader(true);

    todoService
      .deleteTodo(todoId)
      .then(() => {
        setTodos(prev => prev.filter(t => t.id !== todoId));
      })
      .catch(() => {
        setError(ErrorMessage.Delete);
      })
      .finally(() => {
        setTimeout(() => inputRef.current?.focus(), 0);
        setLoader(false);
        setProcessTodoIds(ids => ids.filter(id => id !== todoId));
      });
  }

  function deleteAllCompleted() {
    todos.filter(todo => todo.completed).map(todo => deleteTodo(todo.id));
  }

  function makeTodoComplete(todo: Todo) {
    setProcessTodoIds(ids => [...ids, todo.id]);

    setLoader(true);

    const todoChange = { ...todo, completed: !todo.completed };

    todoService
      .updateTodo(todoChange)
      .then(() => {
        setTodos(prev => prev.map(t => (t.id === todo.id ? todoChange : t)));
      })
      .catch(() => {
        setError(ErrorMessage.Update);
      })
      .finally(() => {
        setLoader(false);
        setProcessTodoIds([]);
      });
  }

  function makeAllTodoComplete() {
    if (todos.every(todo => todo.completed)) {
      todos.filter(todo => todo.completed).map(todo => makeTodoComplete(todo));
    } else {
      todos.filter(todo => !todo.completed).map(todo => makeTodoComplete(todo));
    }
  }

  function updateTodo(todo: Todo, updatedTitle: string) {
    switch (updatedTitle.trim()) {
      case todo.title:
        setProcessTodoIds([]);

        return;
      case '':
        deleteTodo(todo.id);

        return;
    }

    setLoader(true);

    const todoChange = { ...todo, title: updatedTitle };

    todoService
      .updateTodo(todoChange)
      .then(() => {
        setTodos(prev => prev.map(t => (t.id === todo.id ? todoChange : t)));
        setIsEditing(false);
        setChangingValue('');
        setProcessTodoIds([]);
      })
      .catch(() => {
        setError(ErrorMessage.Update);
        setIsEditing(true);
      })
      .finally(() => {
        setLoader(false);
      });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (input.trim().length > 0) {
      creationOfTodo(input.trim());
    } else {
      setError(ErrorMessage.Title);
    }
  }

  useEffect(() => {
    loadTodos();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setError(null);
    }, 3000);
  }, [error]);

  if (!todoService.USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>
      <div className="todoapp__content">
        <Header
          todosLength={todos.length}
          isSomeTodoComplete={todos.every(todo => todo.completed)}
          input={input}
          disableInput={isLoading ? true : false}
          inputRef={inputRef}
          setInput={value => setInput(value)}
          makeAllTodoComplete={makeAllTodoComplete}
          handleSubmit={handleSubmit}
        />

        <section className="todoapp__main" data-cy="TodoList">
          {sorterTodos(filterOption).map(todo => {
            return (
              <TodoItem
                todo={todo}
                loader={isLoading}
                isEditing={isEditing}
                changingValue={changingValue}
                key={todo.id}
                chosenTodoIds={processTodoIds}
                updateTodo={updateTodo}
                deleteTodo={deleteTodo}
                makeTodoComplete={makeTodoComplete}
                setIsEditing={value => {
                  setIsEditing(value);
                }}
                setChangingValue={value => {
                  setChangingValue(value);
                }}
                addProcessTodoId={value => {
                  setProcessTodoIds(prev => [...prev, value]);
                }}
              />
            );
          })}
          {tempTodo && <TempTodo tempTodo={tempTodo} />}
        </section>

        {todos.length > 0 && (
          <Footer
            itemsLeft={todos.filter(t => !t.completed).length}
            filterOption={filterOption}
            disabled={!todos.some(t => t.completed)}
            setFilterOption={setFilterOption}
            deleteAllCompleted={deleteAllCompleted}
          />
        )}
      </div>

      <ErrorNotification error={error} />
    </div>
  );
};
