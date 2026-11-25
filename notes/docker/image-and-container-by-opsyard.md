# Image and container

- **Subject:** Docker
- **Level:** Beginner
- **Lesson it belongs to:** `#/l/c-image/1` and `#/l/c-container/1`
- **By:** Opsyard (example note)
- **Date:** 2026-11-25

## In one sentence

An image is a packed, read-only copy of a program with everything it needs; a container is that image running.

## The problem it solves

A program works on one computer and fails on another, because the language version, libraries or settings differ.

## Think of it like this

| In daily life | In Docker |
|---|---|
| A recipe | Dockerfile |
| A frozen ready meal made from it | Image |
| The meal heated and on the table | Container |
| The supermarket freezer | Registry |

One frozen meal type can be heated at many tables at once, and all taste the same.

Where the comparison stops being true: heating a meal uses it up, but starting a container does not use up the image.

## How it works

1. The Dockerfile lists the steps.
2. `docker build` follows them once and stores the image.
3. `docker run` starts a container from it, as many times as you like.
4. Removing a container does not touch the image.

## Real-time example

- **Situation:** a college gives 120 students the same database for an exam.
- **Problem:** last year 30 laptops had a different version, and the first hour was lost on setup.
- **What they did:** the teacher prepared one image with the sample data and put it in a registry. Each student ran one command.
- **Result:** in this example everyone starts within minutes, with identical data. A student who breaks the database removes the container and starts a fresh one.

```text
docker run --rm -d --name exam -p 5432:5432 registry.example/exam-db:2026
docker rm -f exam
```

## Common mistakes

- Saving answers only inside the container: they are gone when it is removed. Use a volume.
- Using the tag `latest`: two students may get different versions. Pin a version.

## Idea for an animation

1. Recipe turns into one box (image).
2. The box goes to a shelf (registry).
3. Three containers start from the same box.
4. One container breaks, is removed, and a new one appears; the box is unchanged.

## Check yourself

If you delete a container, is the image deleted too? **No.**

## Sources

- https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/
- https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/
